import * as Speech from "expo-speech";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import { speakUrl } from "../api/voice";
import type { Country, Language } from "../types/api";
import { MAX_SPOKEN_TEXT_CHARS } from "../types/api";

type SpeakOptions = { language: Language; country: Country };
type DeviceVoice = Pick<Speech.Voice, "identifier" | "language" | "quality">;

const SENTENCE_END = /(?<=[.!?…])\s+/;
const ENHANCED = "Enhanced" as Speech.VoiceQuality;

/** BCP-47 voice locale for the learner; Spanish follows their country. */
export function speechLocale(language: Language, country: Country): string {
  if (language === "es") return country === "MX" ? "es-MX" : "es-US";
  if (language === "sw") return "sw-KE";
  return "en-US";
}

const normalize = (code: string) => code.toLowerCase().replace("_", "-");

/**
 * The most natural device voice for a locale: the exact locale (es-MX) beats
 * the same language (es-ES), and enhanced voices beat default ones, which are
 * the ones that sound robotic. Null when the device cannot speak the language.
 */
export function bestDeviceVoice(
  voices: DeviceVoice[],
  locale: string,
): DeviceVoice | null {
  const wanted = normalize(locale);
  const language = wanted.split("-")[0];
  let best: DeviceVoice | null = null;
  let bestScore = -1;
  for (const voice of voices) {
    const code = normalize(voice.language);
    if (!code.startsWith(language)) continue;
    const score =
      (code === wanted ? 2 : 0) + (voice.quality === ENHANCED ? 1 : 0);
    if (score > bestScore) [best, bestScore] = [voice, score];
  }
  return best;
}

/** Split long narration at sentence ends so each API request stays under the limit. */
export function chunkText(
  text: string,
  maxChars = MAX_SPOKEN_TEXT_CHARS,
): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const sentence of text.trim().split(SENTENCE_END)) {
    for (const piece of splitHard(sentence, maxChars)) {
      if (current && current.length + 1 + piece.length > maxChars) {
        chunks.push(current);
        current = piece;
      } else current = current ? `${current} ${piece}` : piece;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function splitHard(sentence: string, maxChars: number): string[] {
  const pieces: string[] = [];
  for (let start = 0; start < sentence.length; start += maxChars)
    pieces.push(sentence.slice(start, start + maxChars));
  return pieces;
}

// Each speak() call gets a generation number; stopSpeaking() bumps it so
// anything still loading or queued from an older call is dropped.
let generation = 0;
let player: AudioPlayer | null = null;
let finishCurrent: (() => void) | null = null;

/** Stop anything being read aloud by either engine. */
export function stopSpeaking(): void {
  generation += 1;
  void Speech.stop();
  player?.remove();
  player = null;
  finishCurrent?.();
  finishCurrent = null;
}

/**
 * Read text aloud in the learner's language. Gemini's natural voice is used
 * whenever the API can produce it; if it cannot (no API, quota used up,
 * offline), the device's most natural voice for the language takes over.
 */
export async function speak(
  text: string,
  options: SpeakOptions,
): Promise<void> {
  stopSpeaking();
  const run = generation;
  if (!text.trim()) return;
  // Blind learners often leave the ringer switch on silent; speak anyway.
  await setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  const chunks = chunkText(text);
  for (let index = 0; index < chunks.length; index++) {
    const played = await playFromServer(chunks[index], options.language, run);
    if (run !== generation) return;
    if (!played) {
      await speakOnDevice(chunks.slice(index).join(" "), options);
      return;
    }
  }
}

/** Play one chunk of Gemini speech; false if the API could not produce it. */
async function playFromServer(
  text: string,
  language: Language,
  run: number,
): Promise<boolean> {
  const url = speakUrl(text, language);
  if (!url) return false;
  try {
    // Checking first lets a 503 (quota used up) fall back to the device voice.
    // The API caches the audio, so the player's own request costs no quota.
    const response = await fetch(url);
    if (!response.ok) return false;
  } catch {
    return false;
  }
  if (run !== generation) return true;
  return new Promise((resolve) => {
    finishCurrent = () => resolve(true);
    player = createAudioPlayer({ uri: url });
    player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) resolve(true);
    });
    player.play();
  });
}

async function speakOnDevice(
  text: string,
  { language, country }: SpeakOptions,
): Promise<void> {
  const locale = speechLocale(language, country);
  const voices = await Speech.getAvailableVoicesAsync().catch(() => []);
  const voice = bestDeviceVoice(voices, locale);
  Speech.speak(text, {
    language: voice?.language ?? locale,
    voice: voice?.identifier,
  });
}

import * as Speech from "expo-speech";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import { speakUrl } from "../api/voice";
import type { Country, Language } from "../types/api";
import { MAX_SPOKEN_TEXT_CHARS } from "../types/api";

/** Which engine reads text aloud: the phone's own voice or the API (Gemini). */
export type SpeechEngine = "device" | "server";

type SpeakOptions = { language: Language; country: Country };

const SENTENCE_END = /(?<=[.!?…])\s+/;

/** BCP-47 voice locale for the learner; Spanish follows their country. */
export function speechLocale(language: Language, country: Country): string {
  if (language === "es") return country === "MX" ? "es-MX" : "es-US";
  if (language === "sw") return "sw-KE";
  return "en-US";
}

/** True when the device has any voice for the language, e.g. "sw" or "sw-KE". */
export function hasVoiceFor(
  voices: Pick<Speech.Voice, "language">[],
  language: Language,
): boolean {
  return voices.some((voice) =>
    voice.language.toLowerCase().replace("_", "-").startsWith(language),
  );
}

/**
 * Prefer the phone's voice (instant, free, offline). Use the API only when
 * the phone cannot speak the language, which is common for Swahili.
 */
export function chooseEngine(
  deviceHasVoice: boolean,
  serverAvailable: boolean,
): SpeechEngine {
  return !deviceHasVoice && serverAvailable ? "server" : "device";
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

let player: AudioPlayer | null = null;
let queue: string[] = [];

/** Asked each time: the learner can download a new voice while the app is open. */
function deviceVoices(): Promise<Speech.Voice[]> {
  return Speech.getAvailableVoicesAsync().catch(() => []);
}

/** Stop anything being read aloud by either engine. */
export function stopSpeaking(): void {
  void Speech.stop();
  queue = [];
  player?.remove();
  player = null;
}

/** Read text aloud in the learner's language, replacing anything already playing. */
export async function speak(
  text: string,
  { language, country }: SpeakOptions,
): Promise<void> {
  stopSpeaking();
  if (!text.trim()) return;
  // Blind learners often leave the ringer switch on silent; speak anyway.
  await setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  const deviceHasVoice = hasVoiceFor(await deviceVoices(), language);
  const engine = chooseEngine(deviceHasVoice, speakUrl("", language) !== null);
  if (engine === "device") {
    Speech.speak(text, { language: speechLocale(language, country) });
    return;
  }
  queue = chunkText(text);
  playNext(language);
}

function playNext(language: Language): void {
  const next = queue.shift();
  const url = next && speakUrl(next, language);
  if (!url) return;
  player?.remove();
  player = createAudioPlayer({ uri: url });
  player.addListener("playbackStatusUpdate", (status) => {
    if (status.didJustFinish) playNext(language);
  });
  player.play();
}

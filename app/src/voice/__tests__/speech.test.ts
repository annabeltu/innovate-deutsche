import * as Speech from "expo-speech";
import { createAudioPlayer } from "expo-audio";
import {
  bestDeviceVoice,
  chunkText,
  speak,
  speechLocale,
  stopSpeaking,
} from "../speech";

jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(() => Promise.resolve()),
  getAvailableVoicesAsync: jest.fn(),
}));
jest.mock("expo-audio", () => ({
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  createAudioPlayer: jest.fn(() => ({
    // Finish playback immediately so speak() resolves in tests.
    addListener: jest.fn((_event: string, listener: (status: object) => void) =>
      listener({ didJustFinish: true }),
    ),
    play: jest.fn(),
    remove: jest.fn(),
  })),
}));

const voices = Speech.getAvailableVoicesAsync as jest.Mock;
const fetchMock = jest.fn();
const API = "http://api.test";
const voice = (identifier: string, language: string, quality = "Default") =>
  ({ identifier, language, quality }) as Speech.Voice;

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock;
  fetchMock.mockReset();
  voices.mockResolvedValue([]);
  delete process.env.EXPO_PUBLIC_API_URL;
});

describe("speechLocale", () => {
  it.each([
    ["en", "US", "en-US"],
    ["es", "MX", "es-MX"],
    ["es", "US", "es-US"],
    ["sw", "KE", "sw-KE"],
  ] as const)("speaks %s in %s as %s", (language, country, locale) => {
    expect(speechLocale(language, country)).toBe(locale);
  });
});

describe("bestDeviceVoice", () => {
  const all = [
    voice("es-es-basic", "es-ES"),
    voice("es-mx-basic", "es-MX"),
    voice("es-mx-enhanced", "es_MX", "Enhanced"),
    voice("en-us", "en-US", "Enhanced"),
  ];

  it("prefers an enhanced voice in the exact locale", () => {
    expect(bestDeviceVoice(all, "es-MX")?.identifier).toBe("es-mx-enhanced");
  });
  it("falls back to another accent of the same language", () => {
    expect(bestDeviceVoice(all.slice(0, 1), "es-MX")?.identifier).toBe(
      "es-es-basic",
    );
  });
  it("returns null when the device cannot speak the language", () => {
    expect(bestDeviceVoice(all, "sw-KE")).toBeNull();
  });
});

describe("chunkText", () => {
  it("keeps short text whole", () => {
    expect(chunkText("Karibu. Habari?", 100)).toEqual(["Karibu. Habari?"]);
  });
  it("splits at sentence ends without exceeding the limit", () => {
    const chunks = chunkText("One two. Three four. Five six.", 12);
    expect(chunks).toEqual(["One two.", "Three four.", "Five six."]);
    expect(chunks.every((chunk) => chunk.length <= 12)).toBe(true);
  });
  it("hard-splits a single sentence longer than the limit", () => {
    expect(chunkText("abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
  });
});

describe("speak", () => {
  it("plays Gemini's natural voice in the selected language when the API can", async () => {
    process.env.EXPO_PUBLIC_API_URL = API;
    fetchMock.mockResolvedValue({ ok: true });

    await speak("Hola", { language: "es", country: "MX" });

    const url = `${API}/v1/voice/speak?text=Hola&language=es`;
    expect(fetchMock).toHaveBeenCalledWith(url);
    expect(createAudioPlayer).toHaveBeenCalledWith({ uri: url });
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it("falls back to the most natural device voice when Gemini is out of quota", async () => {
    process.env.EXPO_PUBLIC_API_URL = API;
    fetchMock.mockResolvedValue({ ok: false, status: 503 });
    voices.mockResolvedValue([
      voice("es-us", "es-US"),
      voice("es-mx-enhanced", "es-MX", "Enhanced"),
    ]);

    await speak("Hola", { language: "es", country: "MX" });

    expect(createAudioPlayer).not.toHaveBeenCalled();
    expect(Speech.speak).toHaveBeenCalledWith("Hola", {
      language: "es-MX",
      voice: "es-mx-enhanced",
    });
  });

  it("uses the device voice without an API", async () => {
    await speak("Karibu", { language: "sw", country: "KE" });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(Speech.speak).toHaveBeenCalledWith("Karibu", {
      language: "sw-KE",
      voice: undefined,
    });
  });

  it("does nothing for empty text", async () => {
    await speak("   ", { language: "en", country: "US" });

    expect(Speech.speak).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stopSpeaking stops the device voice", () => {
    stopSpeaking();

    expect(Speech.stop).toHaveBeenCalled();
  });
});

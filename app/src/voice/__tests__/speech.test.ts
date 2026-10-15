import * as Speech from "expo-speech";
import { createAudioPlayer } from "expo-audio";
import {
  chooseEngine,
  chunkText,
  hasVoiceFor,
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
    addListener: jest.fn(),
    play: jest.fn(),
    remove: jest.fn(),
  })),
}));

const voices = Speech.getAvailableVoicesAsync as jest.Mock;
const API = "http://api.test";

beforeEach(() => {
  jest.clearAllMocks();
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

describe("hasVoiceFor", () => {
  it("matches region variants and underscores", () => {
    expect(hasVoiceFor([{ language: "sw_KE" }], "sw")).toBe(true);
    expect(hasVoiceFor([{ language: "es-MX" }], "es")).toBe(true);
    expect(hasVoiceFor([{ language: "en-US" }], "sw")).toBe(false);
  });
});

describe("chooseEngine", () => {
  it("uses the phone voice whenever it can speak the language", () => {
    expect(chooseEngine(true, true)).toBe("device");
  });
  it("falls back to the API only when the phone has no voice", () => {
    expect(chooseEngine(false, true)).toBe("server");
    expect(chooseEngine(false, false)).toBe("device");
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
  it("reads with the phone voice in the learner's locale", async () => {
    voices.mockResolvedValue([{ language: "es-MX" }]);
    process.env.EXPO_PUBLIC_API_URL = API;

    await speak("Hola", { language: "es", country: "MX" });

    expect(Speech.speak).toHaveBeenCalledWith("Hola", { language: "es-MX" });
    expect(createAudioPlayer).not.toHaveBeenCalled();
  });

  it("streams Swahili from the API when the phone has no Swahili voice", async () => {
    voices.mockResolvedValue([{ language: "en-US" }]);
    process.env.EXPO_PUBLIC_API_URL = API;

    await speak("Karibu", { language: "sw", country: "KE" });

    expect(Speech.speak).not.toHaveBeenCalled();
    expect(createAudioPlayer).toHaveBeenCalledWith({
      uri: `${API}/v1/voice/speak?text=Karibu&language=sw`,
    });
  });

  it("does nothing for empty text", async () => {
    await speak("   ", { language: "en", country: "US" });

    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it("stopSpeaking stops the phone voice", () => {
    stopSpeaking();

    expect(Speech.stop).toHaveBeenCalled();
  });
});

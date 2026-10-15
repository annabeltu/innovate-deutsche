import { Platform } from "react-native";
import { recognizeIntent, transcribeRecording } from "../voice";
import { apiRequest } from "../client";
jest.mock("../client", () => ({ apiRequest: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

it("sends the active language when recognizing a reply", async () => {
  await recognizeIntent("siguiente", "es");
  expect(apiRequest).toHaveBeenCalledWith("/v1/voice/intent", {
    method: "POST",
    body: { text: "siguiente", language: "es" },
  });
});

it("uploads audio and language using the backend field names", async () => {
  const append = jest.spyOn(FormData.prototype, "append");
  await transcribeRecording("file:///recording.m4a", "sw");
  expect(append).toHaveBeenCalledWith("audio", {
    uri: "file:///recording.m4a",
    name: "recording.m4a",
    type: "audio/mp4",
  });
  expect(append).toHaveBeenCalledWith("language", "sw");
  expect(apiRequest).toHaveBeenCalledWith("/v1/voice/transcribe", {
    method: "POST",
    body: expect.any(FormData),
  });
  append.mockRestore();
});

it("uploads a browser recording as a blob without sending a native file descriptor", async () => {
  const originalPlatform = Platform.OS;
  const originalFetch = global.fetch;
  Object.defineProperty(Platform, "OS", { value: "web", configurable: true });
  const blob = new Blob(["audio"], { type: "audio/webm" });
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, blob: async () => blob });
  const append = jest.spyOn(FormData.prototype, "append");
  try {
    await transcribeRecording("blob:recording", "es");
    expect(global.fetch).toHaveBeenCalledWith("blob:recording");
    expect(append).toHaveBeenCalledWith("audio", blob, "recording.webm");
    expect(append).toHaveBeenCalledWith("language", "es");
  } finally {
    append.mockRestore();
    Object.defineProperty(Platform, "OS", { value: originalPlatform });
    global.fetch = originalFetch;
  }
});

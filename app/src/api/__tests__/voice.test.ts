import {
  API_UNAVAILABLE,
  VoiceApiError,
  speakUrl,
  transcribeRecording,
} from "../voice";

const API = "http://api.test";
const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = `${API}/`;
});

describe("speakUrl", () => {
  it("encodes text and language into the speak URL", () => {
    expect(speakUrl("¿Qué tal?", "es")).toBe(
      `${API}/v1/voice/speak?text=%C2%BFQu%C3%A9+tal%3F&language=es`,
    );
  });
  it("is null without an API", () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(speakUrl("Hi", "en")).toBeNull();
  });
});

describe("transcribeRecording", () => {
  it("uploads the recording as audio with the language hint", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ text: "Habari", language: "sw" }),
    });

    const text = await transcribeRecording("file:///question.m4a", "sw");

    expect(text).toBe("Habari");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API}/v1/voice/transcribe`);
    const body = init.body as FormData;
    expect(body.get("language")).toBe("sw");
    expect(body.get("audio")).toBeTruthy();
  });

  it("passes the server error code through", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: { code: "audio_too_large", message: "", details: {} },
        }),
    });

    await expect(
      transcribeRecording("file:///q.m4a", "en"),
    ).rejects.toMatchObject({
      code: "audio_too_large",
    });
  });

  it("reports a network failure as apiUnavailable", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));

    await expect(transcribeRecording("file:///q.m4a", "en")).rejects.toEqual(
      new VoiceApiError(API_UNAVAILABLE),
    );
  });

  it("fails fast without an API", async () => {
    delete process.env.EXPO_PUBLIC_API_URL;

    await expect(
      transcribeRecording("file:///q.m4a", "en"),
    ).rejects.toMatchObject({
      code: API_UNAVAILABLE,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

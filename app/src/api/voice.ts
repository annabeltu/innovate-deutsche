import { Platform } from "react-native";
import { apiRequest } from "./client";
import type { ErrorResponse, Language } from "../types/api";
import { MAX_SPOKEN_TEXT_CHARS } from "../types/api";
import type { IntentResponse, TranscriptionResponse } from "../voice/types";

/** Error codes the voice screens translate; server codes pass through as-is. */
export const API_UNAVAILABLE = "apiUnavailable";
const NATIVE_RECORDING = { name: "question.m4a", type: "audio/mp4" };
const WEB_RECORDING_NAME = "question.webm";

/** A voice request failed; `code` matches docs/API_CONTRACTS.md error codes. */
export class VoiceApiError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

/** Base URL of the Kompass API without a trailing slash, or null if not configured. */
export function apiBaseUrl(): string | null {
  const base = process.env.EXPO_PUBLIC_API_URL;
  return base ? base.replace(/\/$/, "") : null;
}

/** URL that streams `text` read aloud as audio/wav, or null without an API. */
export function speakUrl(text: string, language: Language): string | null {
  const base = apiBaseUrl();
  if (!base) return null;
  const query = new URLSearchParams({
    text: text.slice(0, MAX_SPOKEN_TEXT_CHARS),
    language,
  });
  return `${base}/v1/voice/speak?${query.toString()}`;
}

/** Map a short spoken reply to the server's multilingual command vocabulary. */
export function recognizeIntent(
  text: string,
  language: Language,
): Promise<IntentResponse> {
  return apiRequest<IntentResponse>("/v1/voice/intent", {
    method: "POST",
    body: { text, language },
  });
}

/** Send a finished recording to the API and return what the learner said. */
export async function transcribeRecording(
  uri: string,
  language: Language,
): Promise<TranscriptionResponse> {
  const base = apiBaseUrl();
  if (!base) throw new VoiceApiError(API_UNAVAILABLE);
  const body = new FormData();
  body.append("audio", await recordingPart(uri));
  body.append("language", language);
  let response: Response;
  try {
    response = await fetch(`${base}/v1/voice/transcribe`, {
      method: "POST",
      body,
    });
  } catch {
    throw new VoiceApiError(API_UNAVAILABLE);
  }
  if (!response.ok) throw new VoiceApiError(await errorCode(response));
  const data = (await response.json()) as Partial<TranscriptionResponse>;
  if (typeof data.text !== "string") throw new VoiceApiError(API_UNAVAILABLE);
  return {
    text: data.text,
    language: data.language ?? language,
    is_fixture: Boolean(data.is_fixture),
  };
}

/** Native fetch uploads straight from the file URI; the browser needs a Blob. */
async function recordingPart(uri: string): Promise<Blob> {
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    return new File([blob], WEB_RECORDING_NAME, { type: blob.type });
  }
  return { uri, ...NATIVE_RECORDING } as unknown as Blob;
}

async function errorCode(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as Partial<ErrorResponse>;
    return body.error?.code ?? API_UNAVAILABLE;
  } catch {
    return API_UNAVAILABLE;
  }
}

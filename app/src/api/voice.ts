import { Platform } from "react-native";
import { apiRequest } from "./client";
import type { Language } from "../types/api";
import type { IntentResponse, TranscriptionResponse } from "../voice/types";
export { ApiError } from "./client";

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

/** Upload native M4A or browser WebM with the exact API multipart field names. */
export async function transcribeRecording(
  uri: string,
  language: Language,
  mimeType = Platform.OS === "web" ? "audio/webm" : "audio/mp4",
): Promise<TranscriptionResponse> {
  const form = new FormData();
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    if (!response.ok) throw new Error("Recording could not be read");
    form.append("audio", await response.blob(), "recording.webm");
  } else {
    form.append("audio", {
      uri,
      name: "recording.m4a",
      type: mimeType,
    } as unknown as Blob);
  }
  form.append("language", language);
  return apiRequest<TranscriptionResponse>("/v1/voice/transcribe", {
    method: "POST",
    body: form,
  });
}

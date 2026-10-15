import type { ErrorResponse, Language } from '@/src/types/api';
import type { IntentResponse, TranscriptionResponse } from '@/src/voice/types';

// Typed calls to /v1/voice/*. Owner: voice teammate. Move the shared request helper into
// the app's src/api/client.ts once the frontend adds it.

const DEFAULT_RECORDING_TYPE = 'audio/m4a';

/** A non-2xx response from the API, carrying the contract's error code. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Map a short spoken reply to a command (yes, next, option b…) or `unknown`. */
export function recognizeIntent(text: string, language: Language): Promise<IntentResponse> {
  return request<IntentResponse>('/v1/voice/intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language }),
  });
}

/** Upload a recording (a local file URI from expo-audio) and return what was said. */
export function transcribeRecording(
  uri: string,
  language: Language,
  mimeType: string = DEFAULT_RECORDING_TYPE,
): Promise<TranscriptionResponse> {
  const extension = mimeType.split('/')[1] ?? 'm4a';
  const form = new FormData();
  // React Native's FormData takes a { uri, name, type } file descriptor instead of a Blob.
  form.append('audio', { uri, name: `recording.${extension}`, type: mimeType } as unknown as Blob);
  form.append('language', language);
  return request<TranscriptionResponse>('/v1/voice/transcribe', { method: 'POST', body: form });
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, init);
  if (!response.ok) {
    throw await toApiError(response);
  }
  return (await response.json()) as T;
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as ErrorResponse;
    return new ApiError(response.status, body.error.code, body.error.message);
  } catch {
    return new ApiError(response.status, 'http_error', `Request failed with ${response.status}`);
  }
}

function apiBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error('EXPO_PUBLIC_API_URL is not set; see docs/DEPLOYMENT.md');
  }
  return url.replace(/\/+$/, '');
}

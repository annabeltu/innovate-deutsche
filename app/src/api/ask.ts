import type { Country, Language } from "../types/api";
import { API_UNAVAILABLE, VoiceApiError, apiBaseUrl } from "./voice";

/** Ask Kiko a question; returns null when no API is configured (demo mode). */
export async function askKiko(
  question: string,
  country: Country,
  language: Language,
): Promise<string | null> {
  const base = apiBaseUrl();
  if (!base) return null;
  let response: Response;
  try {
    response = await fetch(`${base}/v1/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, country, language }),
    });
  } catch {
    throw new VoiceApiError(API_UNAVAILABLE);
  }
  if (!response.ok) throw new VoiceApiError(API_UNAVAILABLE);
  const data = (await response.json()) as { answer?: unknown };
  if (typeof data.answer !== "string") throw new VoiceApiError(API_UNAVAILABLE);
  return data.answer;
}

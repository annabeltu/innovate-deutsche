import type { Country, Language } from "../types/api";
import { API_UNAVAILABLE, VoiceApiError, apiBaseUrl } from "./voice";

const NOT_FOUND = 404;

/** Ask Kiko a question; returns null in demo mode (no API, or /v1/ask not built yet). */
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
  // /v1/ask (path and lessons API) is not built yet; show the sample answer meanwhile.
  if (response.status === NOT_FOUND) return null;
  if (!response.ok) throw new VoiceApiError(API_UNAVAILABLE);
  const data = (await response.json()) as { answer?: unknown };
  if (typeof data.answer !== "string") throw new VoiceApiError(API_UNAVAILABLE);
  return data.answer;
}

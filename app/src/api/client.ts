// Typed fetch client for the Kompass API. Components never call fetch
// directly; they use the hooks in src/api/lessons.ts.
import type { ErrorResponse } from "../types/api";

/** True when EXPO_PUBLIC_API_URL is set; otherwise screens use local demo content. */
export function isApiConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_API_URL);
}

/** An error response from the API, with the contract's error code. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isErrorResponse(body: unknown): body is ErrorResponse {
  if (typeof body !== "object" || body === null || !("error" in body)) {
    return false;
  }
  const { error } = body as { error: unknown };
  return typeof error === "object" && error !== null && "code" in error;
}

/** Send a JSON request and return the parsed body, or throw ApiError. */
export async function apiRequest<T>(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) throw new ApiError(0, "api_not_configured", "No API URL set");
  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (isErrorResponse(body)) {
      throw new ApiError(response.status, body.error.code, body.error.message);
    }
    throw new ApiError(response.status, "http_error", response.statusText);
  }
  return body as T;
}

import { QueryClient, useMutation } from "@tanstack/react-query";
import type {
  OnboardingRequest,
  OnboardingResponse,
  QuizSubmitRequest,
  QuizSubmitResponse,
} from "../types/api";
export const onboardingClient = new QueryClient();

/** Shared JSON POST client for validated API services. */
export async function postJson<Response>(
  path: string,
  body: unknown,
): Promise<Response> {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) throw new Error("apiUnavailable");
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("apiUnavailable");
  return response.json() as Promise<Response>;
}
/** Create a baseline quiz; its answer key stays on the API. */
export function useStartQuiz() {
  return useMutation(
    {
      mutationFn: (request: OnboardingRequest) =>
        postJson<OnboardingResponse>("/onboarding", request),
    },
    onboardingClient,
  );
}
/** Grade answers and save confidence-weighted proficiency on the API. */
export function useSubmitQuiz(quizId: string) {
  return useMutation(
    {
      mutationFn: (request: QuizSubmitRequest) =>
        postJson<QuizSubmitResponse>(`/quiz/${quizId}/submit`, request),
    },
    onboardingClient,
  );
}

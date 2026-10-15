import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./client";
import { toOnboardingRequest } from "./learner";
import { useApp } from "../state/useApp";
import type {
  OnboardingRequest,
  OnboardingResponse,
  QuizSubmitRequest,
  QuizSubmitResponse,
} from "../types/api";

/** Create a baseline quiz through the shared API client; answers stay server-side. */
export function useStartQuiz() {
  return useMutation({
    mutationFn: (request: OnboardingRequest) =>
      apiRequest<OnboardingResponse>("/v1/onboarding", {
        method: "POST",
        body: request,
      }),
  });
}

/** Save quiz results and reuse that exact learner for the path and lessons. */
export function useSubmitQuiz(quizId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: QuizSubmitRequest) =>
      apiRequest<QuizSubmitResponse>(
        `/v1/quiz/${encodeURIComponent(quizId)}/submit`,
        { method: "POST", body: request },
      ),
    onSuccess: (result) => {
      const state = useApp.getState();
      state.adoptLearner(
        result.profile.user_id,
        JSON.stringify(toOnboardingRequest(state)),
      );
      state.set({ onboarded: true });
      void client.invalidateQueries({ queryKey: ["path"] });
    },
  });
}

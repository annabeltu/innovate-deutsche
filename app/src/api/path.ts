import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "./client";
import { ensureLearner, toOnboardingRequest } from "./learner";
import { useApp } from "../state/useApp";
import type { LearningPath } from "../types/api";

/** Fetch the server path using the same learner as quizzes and lessons. */
export function usePath() {
  const learnerKey = useApp((state) =>
    JSON.stringify(toOnboardingRequest(state)),
  );
  return useQuery({
    queryKey: ["path", learnerKey],
    queryFn: async () => {
      const userId = await ensureLearner();
      return apiRequest<LearningPath>(`/v1/path/${encodeURIComponent(userId)}`);
    },
  });
}

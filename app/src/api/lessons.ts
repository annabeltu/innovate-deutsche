// Server state for lessons: the customized lesson API and lesson requests
// (generation). Uses TanStack Query; nothing here is copied into Zustand
// except the ids the roadmap needs to find a generated lesson again.
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, isApiConfigured } from "./client";
import { ensureLearner, toOnboardingRequest } from "./learner";
import { useApp } from "../state/useApp";
import type {
  BonusLessonResponse,
  Lesson,
  LessonResultRequest,
  LessonResultResponse,
} from "../types/api";

/** Persist a finished lesson before awarding local completion and coins. */
export async function saveLessonResult(
  result: LessonResultRequest,
): Promise<void> {
  const userId = await ensureLearner();
  await apiRequest<LessonResultResponse>(
    `/v1/profile/${encodeURIComponent(userId)}/lesson-results`,
    { method: "POST", body: result },
  );
}

const BONUS_ROUTE_PREFIX = "bonus-";

type LessonIdState = {
  bonus: string[];
  bonusLessonIds: Record<string, string>;
};

/**
 * The server lesson id for a roadmap id: core lessons keep their id; a
 * bonus route ("bonus-2") maps to its generated lesson, or null if the bonus
 * lesson only exists locally.
 */
export function serverLessonId(
  routeId: string,
  state: LessonIdState,
): string | null {
  if (!routeId.startsWith(BONUS_ROUTE_PREFIX)) return routeId;
  const title = state.bonus[Number(routeId.slice(BONUS_ROUTE_PREFIX.length))];
  return title === undefined ? null : (state.bonusLessonIds[title] ?? null);
}

function useLearnerKey(): string {
  return useApp((s) => JSON.stringify(toOnboardingRequest(s)));
}

/** A lesson customized for this learner by GET /v1/lessons/{lesson_id}. */
export function useLesson(lessonId: string | null) {
  const learnerKey = useLearnerKey();
  return useQuery({
    queryKey: ["lesson", lessonId, learnerKey],
    enabled: isApiConfigured() && lessonId !== null,
    queryFn: async () => {
      const userId = await ensureLearner();
      return apiRequest<Lesson>(
        `/v1/lessons/${encodeURIComponent(lessonId ?? "")}?user_id=${encodeURIComponent(userId)}`,
      );
    },
  });
}

/**
 * Ask for a lesson about anything (POST /v1/bonus-lessons). A generated
 * lesson is added to the roadmap; a matching core lesson is returned as-is.
 */
export function useRequestLesson() {
  return useMutation({
    mutationFn: async (request: string) => {
      const userId = await ensureLearner();
      return apiRequest<BonusLessonResponse>("/v1/bonus-lessons", {
        method: "POST",
        body: { user_id: userId, request },
      });
    },
    onSuccess: (result) => {
      if (!result.generated) return;
      const state = useApp.getState();
      state.addBonus(result.lesson.title);
      state.set({
        bonusLessonIds: {
          ...state.bonusLessonIds,
          [result.lesson.title]: result.lesson.lesson_id,
        },
      });
    },
  });
}

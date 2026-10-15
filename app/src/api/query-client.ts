// One QueryClient for the app. Lessons are personalized once per learner, so
// a fetched lesson stays fresh until the learner's answers change.
import { QueryClient } from "@tanstack/react-query";

const LESSON_STALE_MS = 30 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: LESSON_STALE_MS },
    mutations: { retry: 0 },
  },
});

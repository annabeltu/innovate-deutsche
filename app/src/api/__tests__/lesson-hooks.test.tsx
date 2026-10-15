import React from "react";
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useLesson, useRequestLesson, saveLessonResult } from "../lessons";
import { apiRequest } from "../client";
import { ensureLearner } from "../learner";
import { useApp } from "../../state/useApp";
import { usePath } from "../path";
import { useStartQuiz, useSubmitQuiz } from "../onboarding";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);
jest.mock("../client", () => ({
  apiRequest: jest.fn(),
  isApiConfigured: () => true,
}));
jest.mock("../learner", () => ({
  ensureLearner: jest.fn(),
  toOnboardingRequest: () => ({ language: "en" }),
}));
const request = jest.mocked(apiRequest);

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  useApp.setState(useApp.getInitialState());
  jest.mocked(ensureLearner).mockResolvedValue("u_test");
});

it("loads the selected lesson from the customization API", async () => {
  request.mockResolvedValue({ title: "Personalized lesson", cards: [] });
  const { result } = await renderHook(() => useLesson("saving"), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(request).toHaveBeenCalledWith("/v1/lessons/saving?user_id=u_test");
  expect(result.current.data?.title).toBe("Personalized lesson");
});

it("adds a generated API lesson to the roadmap with its backend id", async () => {
  request.mockResolvedValue({
    generated: true,
    matched_topic: null,
    lesson: { lesson_id: "bonus_new", title: "Insurance" },
  });
  const { result } = await renderHook(() => useRequestLesson(), { wrapper });
  await act(() => result.current.mutateAsync("Teach me about insurance"));
  expect(request).toHaveBeenCalledWith("/v1/bonus-lessons", {
    method: "POST",
    body: { user_id: "u_test", request: "Teach me about insurance" },
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(useApp.getState().bonusLessonIds.Insurance).toBe("bonus_new");
});

it("does not add fake lessons when generation fails", async () => {
  request.mockRejectedValue(new Error("unavailable"));
  const { result } = await renderHook(() => useRequestLesson(), { wrapper });
  await act(async () => {
    await expect(result.current.mutateAsync("insurance")).rejects.toThrow(
      "unavailable",
    );
  });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(useApp.getState().bonus).toEqual([]);
});

it("posts completion using the backend lesson id", async () => {
  request.mockResolvedValue({ completed: true });
  const result = {
    lesson_id: "bonus_new",
    correct: 1,
    total: 2,
    completed: true,
  };
  await saveLessonResult(result);
  expect(request).toHaveBeenCalledWith("/v1/profile/u_test/lesson-results", {
    method: "POST",
    body: result,
  });
});

it("loads the preview from the backend for the same learner", async () => {
  request.mockResolvedValue({
    user_id: "u_test",
    lessons: [{ lesson_id: "scams", topic: "scams", completed: false }],
  });
  const { result } = await renderHook(() => usePath(), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(request).toHaveBeenCalledWith("/v1/path/u_test");
  expect(result.current.data?.lessons[0].topic).toBe("scams");
});

it("retains the quiz learner for subsequent lesson requests", async () => {
  request.mockResolvedValue({ profile: { user_id: "u_quiz" }, results: [] });
  const { result } = await renderHook(() => useSubmitQuiz("q_test"), {
    wrapper,
  });
  await act(() =>
    result.current.mutateAsync({
      user_id: "u_quiz",
      answers: [{ question_id: "question-1", option_id: "a" }],
    }),
  );
  expect(request).toHaveBeenCalledWith("/v1/quiz/q_test/submit", {
    method: "POST",
    body: {
      user_id: "u_quiz",
      answers: [{ question_id: "question-1", option_id: "a" }],
    },
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(useApp.getState().learnerId).toBe("u_quiz");
  expect(useApp.getState().learnerKey).toBe(JSON.stringify({ language: "en" }));
  expect(useApp.getState().completed).toEqual([]);
});

it("starts a baseline quiz through the shared API client", async () => {
  request.mockResolvedValue({ user_id: "u_new", quiz: { quiz_id: "q_new" } });
  const { result } = await renderHook(() => useStartQuiz(), { wrapper });
  const body = {
    country: "KE",
    language: "sw",
    life_stage: "student",
    goal: "save_more",
    comfort: 1,
    savings_habit: "none",
    confidence: {
      accounts: 0.5,
      saving: 0.5,
      borrowing: 0.5,
      scams: 0.5,
      budget: 0.5,
    },
  } as const;
  await act(() => result.current.mutateAsync(body));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(request).toHaveBeenCalledWith("/v1/onboarding", {
    method: "POST",
    body,
  });
});

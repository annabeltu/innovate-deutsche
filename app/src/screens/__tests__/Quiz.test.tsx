import React from "react";
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { QuizScreen } from "../Quiz";
import { useStartQuiz, useSubmitQuiz } from "../../api/onboarding";
import { router } from "expo-router";
import { useApp } from "../../state/useApp";
import "../../i18n";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), back: jest.fn() },
  useFocusEffect: jest.fn(),
}));
jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock("../../api/onboarding", () => ({
  useStartQuiz: jest.fn(),
  useSubmitQuiz: jest.fn(),
}));
jest.mock("../../components/VoiceInput", () => ({ VoiceInput: () => null }));

it("submits the server's question and option ids against the quiz learner", async () => {
  useApp.setState({ ...useApp.getInitialState() });
  const mutate = jest.fn((_payload, callbacks) => callbacks.onSuccess());
  jest.mocked(useStartQuiz).mockReturnValue({
    mutate: jest.fn(),
    data: {
      user_id: "u_quiz",
      quiz: {
        quiz_id: "q_real",
        language: "en",
        questions: [
          {
            question_id: "bank-security",
            prompt: "Who can have your PIN?",
            options: [
              { option_id: "a", text: "Only me" },
              { option_id: "b", text: "A stranger" },
            ],
            voice: {
              speak_text:
                "Who can have your PIN? A: only me. B: a stranger. Say A or B.",
            },
          },
        ],
      },
    },
  } as unknown as ReturnType<typeof useStartQuiz>);
  jest.mocked(useSubmitQuiz).mockReturnValue({
    mutate,
    isPending: false,
    isError: false,
  } as unknown as ReturnType<typeof useSubmitQuiz>);

  await render(<QuizScreen />);
  await fireEvent.press(screen.getByRole("radio", { name: "A: Only me" }));
  await fireEvent.press(screen.getByRole("button", { name: "Build my path" }));

  expect(useSubmitQuiz).toHaveBeenCalledWith("q_real");
  expect(mutate).toHaveBeenCalledWith(
    {
      user_id: "u_quiz",
      answers: [{ question_id: "bank-security", option_id: "a" }],
    },
    expect.any(Object),
  );
  expect(router.replace).toHaveBeenCalledWith("/path");
  expect(useApp.getState().completed).toEqual([]);
});

it("starts the server quiz automatically with the current onboarding answers", async () => {
  useApp.setState({
    ...useApp.getInitialState(),
    country: "KE",
    language: "sw",
  });
  const mutate = jest.fn();
  jest.mocked(useStartQuiz).mockReturnValue({
    data: undefined,
    mutate,
    isPending: false,
    isError: false,
  } as unknown as ReturnType<typeof useStartQuiz>);
  await render(<QuizScreen />);
  expect(mutate).toHaveBeenCalledWith(
    expect.objectContaining({
      country: "KE",
      language: "sw",
      confidence: expect.objectContaining({ saving: 0.5 }),
    }),
  );
});

it("shows server connection errors and lets the learner return to setup", async () => {
  useApp.setState({ ...useApp.getInitialState() });
  jest.mocked(useStartQuiz).mockReturnValue({
    data: undefined,
    mutate: jest.fn(),
    isPending: false,
    isError: true,
  } as unknown as ReturnType<typeof useStartQuiz>);
  await render(<QuizScreen />);
  expect(screen.getByRole("alert")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(router.back).toHaveBeenCalled();
});

it("stops displaying a cached quiz whose questions are in the previous language", async () => {
  useApp.getState().set({ ...useApp.getInitialState(), country: "MX" });
  const startQuiz = jest.fn();
  jest.mocked(useStartQuiz).mockReturnValue({
    mutate: startQuiz,
    data: {
      user_id: "u_old",
      quiz: {
        quiz_id: "q_old",
        language: "en",
        questions: [
          {
            question_id: "q1",
            topic: "saving",
            difficulty: 1,
            prompt: "Old English question",
            options: [],
            voice: { speak_text: "Old English question" },
          },
        ],
      },
    },
  } as unknown as ReturnType<typeof useStartQuiz>);
  jest.mocked(useSubmitQuiz).mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useSubmitQuiz>);
  await render(<QuizScreen />);
  expect(screen.getByText("Old English question")).toBeTruthy();
  await act(() => useApp.getState().set({ language: "es" }));
  expect(screen.queryByText("Old English question")).toBeNull();
  expect(startQuiz).toHaveBeenLastCalledWith(
    expect.objectContaining({ language: "es" }),
  );
});

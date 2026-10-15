import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { ApiLesson } from "../ApiLesson";
import { useLesson } from "../../api/lessons";
import { useApp } from "../../state/useApp";
import type { Lesson } from "../../types/api";
import "../../i18n";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useFocusEffect: jest.fn(),
}));
jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock("../../api/lessons", () => ({ useLesson: jest.fn() }));

const lesson: Lesson = {
  lesson_id: "saving",
  topic: "saving",
  title: "Safe Saving",
  goal: "Compare where money can be kept.",
  difficulty: 1,
  cards: [
    {
      card_id: "where-money-lives",
      type: "concept",
      text: "A bank account keeps money protected by KDIC.",
      options: {},
      correct_option: null,
      voice: {
        speak_text:
          "A bank account keeps money protected. Say next to continue.",
        answer_mode: "say_next",
        spoken_options: {},
        correct_feedback: null,
        incorrect_feedback: null,
      },
    },
    {
      card_id: "protected-quiz",
      type: "mc_quiz",
      text: "Where is your money protected?",
      options: { a: "In a licensed bank", b: "Under the mattress" },
      correct_option: "a",
      voice: {
        speak_text:
          "Where? A: in a licensed bank. B: under the mattress. Say A or B.",
        answer_mode: "say_option",
        spoken_options: { a: "in a licensed bank", b: "under the mattress" },
        correct_feedback: "Correct. Deposits are insured.",
        incorrect_feedback: "Not quite. The answer is A.",
      },
    },
  ],
};

const mockedUseLesson = useLesson as jest.Mock;

async function showLesson(result: object) {
  mockedUseLesson.mockReturnValue(result);
  await render(<ApiLesson routeId="saving" lessonId="saving" />);
}

describe("ApiLesson", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useApp.setState({ completed: [], coins: 0, readAloud: false });
  });

  it("shows a loading message while the lesson is prepared", async () => {
    await showLesson({ isPending: true, isError: false });

    expect(screen.getByText("Kiko is preparing your lesson…")).toBeTruthy();
  });

  it("offers a retry when the lesson fails to load", async () => {
    const refetch = jest.fn();
    await showLesson({ isPending: false, isError: true, refetch });

    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));

    expect(refetch).toHaveBeenCalled();
  });

  it("shows customized card text and moves to the next card", async () => {
    await showLesson({ isPending: false, isError: false, data: lesson });

    expect(
      screen.getByText("A bank account keeps money protected by KDIC."),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("Where is your money protected?")).toBeTruthy();
  });

  it("gives feedback on a wrong answer and finishes after the right one", async () => {
    await showLesson({ isPending: false, isError: false, data: lesson });
    await fireEvent.press(screen.getByRole("button", { name: "Next" }));

    await fireEvent.press(
      screen.getByRole("button", { name: "B. Under the mattress" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Check  ✓" }));
    expect(screen.getByText("Not quite. The answer is A.")).toBeTruthy();

    await fireEvent.press(
      screen.getByRole("button", { name: "A. In a licensed bank" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Check  ✓" }));
    expect(screen.getByText("Correct. Deposits are insured.")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Finish" }));

    expect(useApp.getState().completed).toContain("saving");
    expect(router.replace).toHaveBeenCalledWith({
      pathname: "/success",
      params: { id: "saving", rewarded: "true" },
    });
  });

  it("reads each card's voice text aloud in read-aloud mode", async () => {
    const Speech = jest.requireMock("expo-speech");
    useApp.setState({ readAloud: true, country: "KE", language: "sw" });
    await showLesson({ isPending: false, isError: false, data: lesson });

    expect(Speech.speak).toHaveBeenCalledWith(
      "A bank account keeps money protected. Say next to continue.",
      { language: "sw" },
    );
  });
});

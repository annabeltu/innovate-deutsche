import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { ApiLesson } from "../ApiLesson";
import { recognizeIntent } from "../../api/voice";
import { useLesson, saveLessonResult } from "../../api/lessons";
import { useApp } from "../../state/useApp";
import type { Lesson } from "../../types/api";
import i18n from "../../i18n";
import { ApiError } from "../../api/client";

jest.mock("../../api/voice", () => ({ recognizeIntent: jest.fn() }));
jest.mock("../VoiceInput", () => {
  const { Button, View } = jest.requireActual("react-native");
  return {
    VoiceInput: ({ onText }: { onText: (text: string) => Promise<void> }) => (
      <View>
        {["a", "b", "next", "back", "repeat", "help"].map((text) => (
          <Button
            key={text}
            title={`Say ${text}`}
            onPress={() => onText(text)}
          />
        ))}
      </View>
    ),
  };
});
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useFocusEffect: jest.fn(),
}));
jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock("../../api/lessons", () => ({
  useLesson: jest.fn(),
  saveLessonResult: jest.fn().mockResolvedValue(undefined),
}));

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
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    jest.clearAllMocks();
    jest.mocked(recognizeIntent).mockImplementation(async (text: string) => ({
      intent:
        text === "a" || text === "b"
          ? "option"
          : (text as "next" | "back" | "repeat" | "help"),
      option_id: text === "a" || text === "b" ? text : null,
      number: null,
      confidence: 1,
      normalized_text: text,
    }));
    useApp.setState({
      completed: [],
      coins: 0,
      readAloud: false,
      language: "en",
    });
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
    await fireEvent.press(screen.getByRole("button", { name: "Check" }));
    expect(screen.getByText("Not quite. The answer is A.")).toBeTruthy();

    await fireEvent.press(
      screen.getByRole("button", { name: "A. In a licensed bank" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Check" }));
    expect(screen.getByText("Correct. Deposits are insured.")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Finish" }));

    expect(saveLessonResult).toHaveBeenCalledWith({
      lesson_id: "saving",
      correct: 0,
      total: 1,
      completed: true,
    });
    expect(useApp.getState().completed).toContain("saving");
    expect(router.replace).toHaveBeenCalledWith({
      pathname: "/success",
      params: { id: "saving", rewarded: "true" },
    });
  });

  it("keeps progress unchanged when the backend rejects completion", async () => {
    jest.mocked(saveLessonResult).mockRejectedValueOnce(new Error("offline"));
    const oneCard = { ...lesson, cards: [lesson.cards[0]] };
    await showLesson({ isPending: false, isError: false, data: oneCard });
    await fireEvent.press(screen.getByRole("button", { name: "Finish" }));

    expect(useApp.getState().completed).toEqual([]);
    expect(useApp.getState().coins).toBe(0);
    expect(router.replace).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "This lesson could not load. Check your connection and try again.",
      ),
    ).toBeTruthy();
  });

  it("answers lesson questions by voice and saves their actual first-attempt score", async () => {
    await showLesson({ isPending: false, isError: false, data: lesson });
    await fireEvent.press(screen.getByRole("button", { name: "Say next" }));
    await fireEvent.press(screen.getByRole("button", { name: "Say b" }));
    expect(screen.getByText("Not quite. The answer is A.")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Say a" }));
    await fireEvent.press(screen.getByRole("button", { name: "Say next" }));
    expect(saveLessonResult).toHaveBeenCalledWith({
      lesson_id: "saving",
      correct: 0,
      total: 1,
      completed: true,
    });
    expect(useApp.getState().completed).toContain("saving");
  });

  it("supports spoken repeat, help and back during a lesson", async () => {
    await showLesson({ isPending: false, isError: false, data: lesson });
    await fireEvent.press(screen.getByRole("button", { name: "Say repeat" }));
    await fireEvent.press(screen.getByRole("button", { name: "Say help" }));
    await fireEvent.press(screen.getByRole("button", { name: "Say next" }));
    await fireEvent.press(screen.getByRole("button", { name: "Say back" }));
    expect(screen.getByText(lesson.cards[0].text)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Say back" }));
    expect(router.replace).toHaveBeenCalledWith("/roadmap");
  });

  it("shows a Spanish retry message instead of untranslated lesson content", async () => {
    useApp.getState().set({ language: "es", country: "MX" });
    await showLesson({
      isPending: false,
      isError: true,
      error: new ApiError(
        503,
        "lesson_translation_failed",
        "English server error",
      ),
      refetch: jest.fn(),
    });
    expect(
      screen.getByText(
        "Esta lección no está disponible en tu idioma ahora. Inténtalo de nuevo en un momento.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("English server error")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Intentar de nuevo" }),
    ).toBeTruthy();
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

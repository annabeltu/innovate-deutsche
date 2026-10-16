import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { LessonCardView } from "../LessonCardView";
import { useApp } from "../../../state/useApp";
import type { Lesson, LessonCard } from "../../../types/api";
import i18n from "../../../i18n";

jest.mock("../../../api/voice", () => ({ recognizeIntent: jest.fn() }));
jest.mock("../../VoiceInput", () => ({ VoiceMicButton: () => null }));
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useFocusEffect: jest.fn(),
}));
jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

// Real lessons from the local API: core lessons for many learner profiles
// (en, es, sw) and generated custom lessons, including older ones whose
// "bridge" cards are plain advice.
const fixture: {
  core: Lesson[];
  generated: Lesson[];
  generated_with_advice_bridges: Lesson[];
} = require("../../../../../data/fixtures/lessons/heavy-lessons.json");

const lessons = [
  ...fixture.core,
  ...fixture.generated,
  ...fixture.generated_with_advice_bridges,
];
const cases = lessons.flatMap((lesson, lessonIndex) =>
  lesson.cards.map((card, cardIndex) => ({
    name: `${lessonIndex}:${lesson.lesson_id}:${card.card_id}`,
    lesson,
    card,
    isLast: cardIndex === lesson.cards.length - 1,
  })),
);

async function completeCard(card: LessonCard) {
  const reveal = screen.queryByRole("button", { name: "Tap to reveal" });
  if (reveal) await fireEvent.press(reveal);
  for (const side of ["Your country", "The bigger picture"]) {
    const flip = screen.queryByRole("button", { name: side });
    if (flip) await fireEvent.press(flip);
  }
  if (card.correct_option === null) return;
  const letter = card.correct_option;
  const name = `${letter.toUpperCase()}. ${card.options[letter]}`;
  if (card.type === "scam_swipe") {
    await fireEvent.press(screen.getByRole("button", { name }));
    return;
  }
  await fireEvent.press(screen.getByRole("radio", { name }));
  await fireEvent.press(screen.getByRole("button", { name: "Check" }));
}

describe.each([false, true])("with larger text %p", (large) => {
  beforeEach(async () => {
    useApp.getState().set({
      ...useApp.getInitialState(),
      language: "en",
      readAloud: false,
      large,
    });
    await i18n.changeLanguage("en");
  });

  it.each(cases)(
    "renders and completes card $name",
    async ({ lesson, card, isLast }) => {
      await render(
        <LessonCardView
          title={lesson.title}
          card={card}
          progress={0.5}
          isLast={isLast}
          rewardCoins={10}
          onNext={jest.fn()}
          saving={false}
          saveFailed={false}
          onWrong={jest.fn()}
          onBack={jest.fn()}
        />,
      );

      await completeCard(card);

      const next = screen.getByRole("button", {
        name: isLast ? "Finish" : "Next",
      });
      expect(next.props.accessibilityState.disabled).toBe(false);
    },
  );
});

it("covers every interactive card type and the generated lessons", () => {
  const types = new Set(
    lessons.flatMap((lesson) => lesson.cards.map((card) => card.type)),
  );

  expect([...types].sort()).toEqual([
    "bridge",
    "concept",
    "mc_quiz",
    "scam_swipe",
    "takeaway",
  ]);
  expect(fixture.generated.length).toBeGreaterThanOrEqual(3);
});

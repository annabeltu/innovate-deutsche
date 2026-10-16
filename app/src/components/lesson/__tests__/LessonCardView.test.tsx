import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { LessonCardView } from "../LessonCardView";
import { useApp } from "../../../state/useApp";
import type { LessonCard } from "../../../types/api";
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

const voice = {
  speak_text: "Say next to continue.",
  answer_mode: "say_next" as const,
  spoken_options: {},
  correct_feedback: null,
  incorrect_feedback: null,
};
const card = (overrides: Partial<LessonCard>): LessonCard => ({
  card_id: "card",
  type: "concept",
  text: "",
  options: {},
  correct_option: null,
  voice,
  ...overrides,
});

async function show(lessonCard: LessonCard, rewardCoins = 0) {
  await render(
    <LessonCardView
      title="Safe Saving"
      card={lessonCard}
      progress={0.5}
      isLast={false}
      rewardCoins={rewardCoins}
      onNext={jest.fn()}
      saving={false}
      saveFailed={false}
      onWrong={jest.fn()}
      onBack={jest.fn()}
    />,
  );
}

const nextButton = () => screen.getByRole("button", { name: "Next" });

beforeEach(async () => {
  useApp.getState().set({
    ...useApp.getInitialState(),
    language: "en",
    readAloud: false,
  });
  await i18n.changeLanguage("en");
});

it("keeps Next locked until a concept card's extra lines are revealed", async () => {
  await show(
    card({
      text: "A chama builds the habit. It is not insured. Keep a bank account too.",
    }),
  );

  expect(screen.getByText("A chama builds the habit.")).toBeTruthy();
  expect(screen.queryByText("It is not insured.")).toBeNull();
  expect(nextButton().props.accessibilityState.disabled).toBe(true);

  await fireEvent.press(screen.getByRole("button", { name: "Tap to reveal" }));

  expect(screen.getByText("It is not insured.")).toBeTruthy();
  expect(nextButton().props.accessibilityState.disabled).toBe(false);
});

it("starts fully revealed in read-aloud mode so voice users never need to tap", async () => {
  useApp.getState().set({ readAloud: true });

  await show(card({ text: "One thing. Another thing." }));

  expect(screen.getByText("Another thing.")).toBeTruthy();
  expect(nextButton().props.accessibilityState.disabled).toBe(false);
});

it("unlocks a bridge card once both sides are flipped", async () => {
  await show(
    card({
      type: "bridge",
      text: "In your country, 45% of adults save. In richer countries, it is 70%.",
    }),
  );

  await fireEvent.press(screen.getByRole("button", { name: "Your country" }));
  expect(nextButton().props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(
    screen.getByRole("button", { name: "The bigger picture" }),
  );

  expect(
    screen.getByLabelText(
      "The bigger picture. In richer countries, it is 70%.",
    ),
  ).toBeTruthy();
  expect(nextButton().props.accessibilityState.disabled).toBe(false);
});

it("lets the learner retry a scam card and flags the message once it is right", async () => {
  await show(
    card({
      type: "scam_swipe",
      text: "A message says: You won! Send $50 today. Is this a scam or safe?",
      options: { a: "Scam", b: "Safe" },
      correct_option: "a",
      voice: {
        ...voice,
        correct_feedback: "Right, it is a scam.",
        incorrect_feedback: "Look again.",
      },
    }),
  );

  await fireEvent.press(screen.getByRole("button", { name: "B. Safe" }));
  expect(screen.getByText("Look again.")).toBeTruthy();
  expect(nextButton().props.accessibilityState.disabled).toBe(true);

  await fireEvent.press(screen.getByRole("button", { name: "A. Scam" }));
  expect(screen.getByText("Right, it is a scam.")).toBeTruthy();
  expect(
    screen.getByText("Red flags are highlighted in the message"),
  ).toBeTruthy();
  expect(nextButton().props.accessibilityState.disabled).toBe(false);
});

it("shows the coins a takeaway earns the first time", async () => {
  await show(card({ type: "takeaway", text: "Save a little every week." }), 10);

  expect(screen.getByText("Save a little every week.")).toBeTruthy();
  expect(screen.getByLabelText("+10 coins")).toBeTruthy();
  expect(nextButton().props.accessibilityState.disabled).toBe(false);
});

it("closes the lesson from the top bar with a spoken name", async () => {
  await show(card({ text: "Short card." }));

  expect(screen.getByRole("button", { name: "Close lesson" })).toBeTruthy();
});

it("follows read-aloud when saved settings load after the card appears", async () => {
  useApp.getState().set({ readAloud: true });
  await show(card({ text: "One thing. Another thing." }));

  // Saved settings arrive after the first render and turn read-aloud off.
  await act(async () => useApp.getState().set({ readAloud: false }));

  expect(screen.getByRole("button", { name: "Tap to reveal" })).toBeTruthy();
  expect(nextButton().props.accessibilityState.disabled).toBe(true);
});

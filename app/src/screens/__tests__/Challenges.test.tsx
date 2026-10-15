import { TransferLesson } from "../TransferLesson";
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { BudgetChallenge } from "../BudgetChallenge";
import { ScamChallenge } from "../ScamChallenge";
import { useApp } from "../../state/useApp";
import { buildRoadmap } from "../../onboarding/roadmap";
import { router } from "expo-router";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));
jest.mock("expo-router", () => ({ router: { replace: jest.fn() } }));
jest.mock("expo-speech", () => ({ stop: jest.fn(), speak: jest.fn() }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("@react-native-community/slider", () => ({
  __esModule: true,
  default: jest.requireActual("react-native").View,
}));
jest.mock("../../components/ui", () => {
  const { View, Text } = jest.requireActual("react-native");
  return {
    Screen: ({
      children,
      footer,
    }: {
      children: React.ReactNode;
      footer?: React.ReactNode;
    }) => (
      <View>
        {children}
        {footer}
      </View>
    ),
    Progress: View,
    Txt: Text,
  };
});
beforeEach(() => {
  useApp.getState().set({
    country: "US",
    language: "en",
    confidence: [0.75, 0.5, 1, 0.25, 0],
    completed: [],
    coins: 100,
    hearts: 5,
    readAloud: false,
  });
  jest.clearAllMocks();
});
it("checks the adjusted budget, opens success, and unlocks the next topic", () => {
  const screen = render(<BudgetChallenge />);
  fireEvent.press(screen.getByRole("button", { name: "check" }));
  expect(screen.getByText("challenge.budgetError")).toBeTruthy();
  expect(useApp.getState().coins).toBe(100);
  fireEvent(screen.getByLabelText("challenge.school"), "valueChange", 100);
  fireEvent.press(screen.getByRole("button", { name: "check" }));
  expect(screen.getByText("challenge.nice")).toBeTruthy();
  expect(useApp.getState().coins).toBe(110);
  expect(useApp.getState().completed).toEqual(["budget"]);
  expect(
    buildRoadmap(
      useApp.getState().confidence,
      useApp.getState().completed,
    ).find((lesson) => lesson.status === "current")?.topic,
  ).toBe("scams");
  fireEvent.press(screen.getByRole("button", { name: "continue" }));
  expect(router.replace).toHaveBeenCalledWith("/roadmap");
});
it("allows retrying a scam answer and rewards correct identification once", () => {
  const screen = render(<ScamChallenge />);
  fireEvent.press(screen.getByRole("button", { name: "challenge.legit" }));
  expect(screen.getByText("challenge.scamError")).toBeTruthy();
  expect(useApp.getState().coins).toBe(100);
  expect(useApp.getState().hearts).toBe(5);
  fireEvent.press(screen.getByRole("button", { name: "challenge.scam" }));
  expect(screen.getByText("challenge.scamSuccess")).toBeTruthy();
  expect(useApp.getState().coins).toBe(110);
});
it("never awards duplicate coins for a completed challenge", () => {
  useApp.getState().set({ completed: ["scams"], coins: 110 });
  const replay = render(<ScamChallenge />);
  fireEvent.press(replay.getByRole("button", { name: "challenge.scam" }));
  expect(replay.getByText("challenge.replayed")).toBeTruthy();
  expect(useApp.getState().coins).toBe(110);
});

it("completes the curated bonus lesson and rewards it only once", () => {
  const screen = render(<TransferLesson id="bonus-0" />);
  fireEvent.press(
    screen.getByRole("radio", { name: "B. experience.transferB" }),
  );
  fireEvent.press(screen.getByRole("button", { name: "check" }));
  expect(screen.getByText("experience.transferRetry")).toBeTruthy();
  fireEvent.press(
    screen.getByRole("radio", { name: "A. experience.transferA" }),
  );
  fireEvent.press(screen.getByRole("button", { name: "check" }));
  expect(screen.getByText("challenge.transferSuccess")).toBeTruthy();
  expect(useApp.getState().completed).toContain("bonus-0");
  expect(useApp.getState().coins).toBe(110);
});

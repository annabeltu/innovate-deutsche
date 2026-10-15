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
  ...jest.requireActual("react-i18next"),
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
it("checks the adjusted budget, opens success, and unlocks the next topic", async () => {
  const screen = await render(<BudgetChallenge />);
  await fireEvent.press(screen.getByRole("button", { name: "check" }));
  expect(screen.getByText("challenge.budgetError")).toBeTruthy();
  expect(useApp.getState().coins).toBe(100);
  await fireEvent(
    screen.getByLabelText("challenge.school"),
    "valueChange",
    100,
  );
  await fireEvent.press(screen.getByRole("button", { name: "check" }));
  expect(screen.getByText("challenge.nice")).toBeTruthy();
  expect(useApp.getState().coins).toBe(110);
  expect(useApp.getState().completed).toEqual(["budget"]);
  expect(
    buildRoadmap(
      useApp.getState().confidence,
      useApp.getState().completed,
    ).find((lesson) => lesson.status === "current")?.topic,
  ).toBe("scams");
  await fireEvent.press(screen.getByRole("button", { name: "continue" }));
  expect(router.replace).toHaveBeenCalledWith("/roadmap");
});
it("allows retrying a scam answer and rewards correct identification once", async () => {
  const screen = await render(<ScamChallenge />);
  await fireEvent.press(
    screen.getByRole("button", { name: "challenge.legit" }),
  );
  expect(screen.getByText("challenge.scamError")).toBeTruthy();
  expect(useApp.getState().coins).toBe(100);
  expect(useApp.getState().hearts).toBe(5);
  await fireEvent.press(screen.getByRole("button", { name: "challenge.scam" }));
  expect(screen.getByText("challenge.scamSuccess")).toBeTruthy();
  expect(useApp.getState().coins).toBe(110);
});
it("never awards duplicate coins for a completed challenge", async () => {
  useApp.getState().set({ completed: ["scams"], coins: 110 });
  const replay = await render(<ScamChallenge />);
  await fireEvent.press(replay.getByRole("button", { name: "challenge.scam" }));
  expect(replay.getByText("challenge.replayed")).toBeTruthy();
  expect(useApp.getState().coins).toBe(110);
});

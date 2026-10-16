import React from "react";
import { render, screen } from "@testing-library/react-native";
import { CoinReward, RewardCelebration } from "../RewardCelebration";
import { useApp } from "../../state/useApp";
import i18n from "../../i18n";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn() }));

beforeEach(async () => {
  useApp.getState().set({ ...useApp.getInitialState(), language: "en" });
  await i18n.changeLanguage("en");
});

it("shows the full coin reward at once when motion is off", async () => {
  await render(<CoinReward count={10} still />);

  expect(screen.getByText("+10 coins")).toBeTruthy();
});

it("always tells screen readers the final amount, even while counting up", async () => {
  await render(<CoinReward count={10} still={false} />);

  expect(screen.getByLabelText("+10 coins")).toBeTruthy();
});

it("keeps Kiko on screen for the celebration", async () => {
  await render(<RewardCelebration still />);

  expect(
    screen.getByLabelText("Kiko, your friendly compass guide"),
  ).toBeTruthy();
});

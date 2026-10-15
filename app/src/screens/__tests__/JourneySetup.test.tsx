import React from "react";
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { JourneySetup } from "../JourneySetup";
import { buildOnboardingRequest } from "../../onboarding/request";
import { useApp } from "../../state/useApp";
import "../../i18n";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);
jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useFocusEffect: jest.fn(),
}));
jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn() }));

it("sends the selected stage, goal and comfort ids through the API adapter", async () => {
  useApp.setState(useApp.getInitialState());
  await render(<JourneySetup />);
  await fireEvent.press(screen.getByRole("button", { name: "Parent" }));
  await fireEvent.press(screen.getByRole("radio", { name: "Avoid debt" }));
  await fireEvent.press(screen.getByRole("radio", { name: "Beginner" }));

  const request = buildOnboardingRequest(useApp.getState());
  expect(request.life_stage).toBe("parent");
  expect(request.goal).toBe("avoid_debt");
  expect(request.comfort).toBe(1);
  expect(useApp.getState().completed).toEqual([]);
});

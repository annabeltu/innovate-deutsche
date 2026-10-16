import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { IconButton, Nav, OptionRow } from "../ui";
import { useApp } from "../../state/useApp";
import i18n from "../../i18n";

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

beforeEach(async () => {
  jest.clearAllMocks();
  useApp.getState().set({ ...useApp.getInitialState(), language: "en" });
  await i18n.changeLanguage("en");
});

it("announces an answer option as a checked radio with its letter", async () => {
  const onPress = jest.fn();
  await render(
    <OptionRow
      title="Save it"
      letter="A"
      selected
      onPress={onPress}
      accessibilityLabel="A: Save it"
      accessibilityHint="Choose this answer"
    />,
  );

  const option = screen.getByRole("radio", { name: "A: Save it" });
  expect(option.props.accessibilityState).toMatchObject({ checked: true });
  await fireEvent.press(option);
  expect(onPress).toHaveBeenCalled();
});

it("does not answer when the option is disabled", async () => {
  const onPress = jest.fn();
  await render(
    <OptionRow
      title="Scam"
      tone="danger"
      disabled
      onPress={onPress}
      accessibilityHint="Choose this answer"
    />,
  );

  await fireEvent.press(screen.getByRole("radio", { name: "Scam" }));
  expect(onPress).not.toHaveBeenCalled();
});

it("gives an icon-only button a spoken name and hint", async () => {
  const onPress = jest.fn();
  await render(
    <IconButton
      icon="chevron-left"
      onPress={onPress}
      accessibilityLabel="Back"
      accessibilityHint="Return to your path"
    />,
  );

  const back = screen.getByRole("button", { name: "Back" });
  expect(back.props.accessibilityHint).toBe("Return to your path");
  await fireEvent.press(back);
  expect(onPress).toHaveBeenCalled();
});

it("marks the active tab and switches screens from the tab bar", async () => {
  await render(<Nav active="shop" />);

  expect(
    screen.getByRole("tab", { name: "Shop" }).props.accessibilityState,
  ).toMatchObject({ selected: true });
  await fireEvent.press(screen.getByRole("tab", { name: "Practice" }));
  expect(router.replace).toHaveBeenCalledWith("/practice");
});

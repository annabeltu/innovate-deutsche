import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Speech from "expo-speech";
import { Kiko, KikoNote } from "../Kiko";
import { Button } from "../ui";
import { useApp } from "../../state/useApp";
import i18n from "../../i18n";

jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useFocusEffect: jest.fn(),
}));
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

it("reads a Kiko note aloud in the learner's language when pressed", async () => {
  await render(<KikoNote message="No wrong answers." />);
  const note = screen.getByRole("button", { name: "No wrong answers." });
  expect(note.props.accessibilityHint).toBe("Hear Kiko say this");
  await fireEvent.press(note);
  expect(Speech.speak).toHaveBeenCalledWith("No wrong answers.", {
    language: "en",
  });
});

it("hides the decorative Kiko inside a note from screen readers", async () => {
  await render(<KikoNote message="Up next" />);
  expect(
    screen.queryByLabelText("Kiko, your friendly compass guide"),
  ).toBeNull();
});

it.each(["happy", "cheer", "thinking", "oops"] as const)(
  "describes Kiko to screen readers in the %s mood",
  async (mood) => {
    await render(<Kiko mood={mood} />);
    expect(
      screen.getByLabelText("Kiko, your friendly compass guide"),
    ).toBeTruthy();
  },
);

it("keeps a button's spoken name free of its icon", async () => {
  const onPress = jest.fn();
  await render(
    <Button title="Try again" icon="refresh-cw" onPress={onPress} />,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

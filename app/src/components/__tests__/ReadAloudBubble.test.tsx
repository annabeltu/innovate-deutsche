import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { ReadAloudBubble } from "../ReadAloudBubble";
import { useApp } from "../../state/useApp";
import { useNarration } from "../../voice/narration";
import { speak, stopSpeaking } from "../../voice/speech";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
// Icons load fonts asynchronously; the label and role are what matter here.
jest.mock("@expo/vector-icons", () => ({ Feather: () => null }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("../../voice/speech", () => ({
  speak: jest.fn(() => Promise.resolve()),
  stopSpeaking: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    useApp.getState().set({ readAloud: true, language: "sw", country: "KE" });
    useNarration.setState({ text: "Karibu Kompass.", speaking: false });
  });
});

it("is hidden when read aloud is off", () => {
  act(() => {
    useApp.getState().set({ readAloud: false });
  });

  const screen = render(<ReadAloudBubble />);

  expect(screen.queryByRole("button")).toBeNull();
});

it("reads the screen in view in the selected language", () => {
  const screen = render(<ReadAloudBubble />);

  fireEvent.press(screen.getByRole("button", { name: "voice.readScreen" }));

  expect(speak).toHaveBeenCalledWith("Karibu Kompass.", {
    language: "sw",
    country: "KE",
  });
});

it("becomes a stop button while speaking", () => {
  act(() => {
    useNarration.setState({ speaking: true });
  });
  const screen = render(<ReadAloudBubble />);

  fireEvent.press(screen.getByRole("button", { name: "voice.stopReading" }));

  expect(stopSpeaking).toHaveBeenCalled();
  expect(speak).not.toHaveBeenCalled();
});

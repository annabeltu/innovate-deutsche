import React from "react";
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Welcome } from "../Welcome";
import { useApp } from "../../state/useApp";
import "../../i18n";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useFocusEffect: jest.fn(),
}));
jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

it("keeps the same brand text and sizing when switching countries including USA", async () => {
  useApp.setState({
    ...useApp.getInitialState(),
    country: "MX",
    languageChosen: true,
  });
  await render(<Welcome />);
  const originalBankStyle = screen.getByText("Deutsche Bank").props.style;
  const originalKompassStyle = screen.getByText("mpass").props.style;
  const originalHeaderStyle = screen.getByLabelText("Deutsche Bank. Kompass")
    .props.style;

  for (const country of ["United States", "Kenya", "Mexico"]) {
    await fireEvent.press(screen.getByRole("button", { name: country }));

    expect(screen.getByText("Deutsche Bank").props.style).toEqual(
      originalBankStyle,
    );
    expect(screen.getByText("mpass").props.style).toEqual(originalKompassStyle);
    expect(screen.getByLabelText("Deutsche Bank. Kompass").props.style).toEqual(
      originalHeaderStyle,
    );
  }
});

it("updates country names, accessibility controls and hints immediately from the language picker", async () => {
  useApp.getState().set({ ...useApp.getInitialState(), country: "MX" });
  await render(<Welcome />);
  await fireEvent.press(screen.getByRole("radio", { name: "Español" }));
  expect(screen.getByRole("button", { name: "Estados Unidos" })).toBeTruthy();
  expect(screen.getByLabelText("Leer en voz alta")).toBeTruthy();
  expect(screen.queryByText("Read aloud")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Kenia" }));
  await fireEvent.press(screen.getByRole("radio", { name: "Kiswahili" }));
  expect(screen.getByRole("button", { name: "Marekani" })).toBeTruthy();
  expect(screen.getByLabelText("Soma kwa sauti")).toBeTruthy();
  expect(screen.queryByText("Leer en voz alta")).toBeNull();
});

it("shows the full USA scenery instead of a cropped reference with a sky strip", async () => {
  useApp.getState().set({
    ...useApp.getInitialState(),
    country: "US",
    languageChosen: true,
  });
  await render(<Welcome />);
  const scenery = screen.getByLabelText(
    "Statue of Liberty and the New York skyline",
  );
  expect(scenery.props.source).toEqual(
    require("../../../assets/welcome/us.png"),
  );
});

it("names every language for screen readers until a language is chosen", async () => {
  useApp.setState({ ...useApp.getInitialState(), country: "KE" });
  await render(<Welcome />);
  expect(
    screen.getByRole("button", {
      name: "United States. Estados Unidos. Marekani",
    }),
  ).toBeTruthy();
});

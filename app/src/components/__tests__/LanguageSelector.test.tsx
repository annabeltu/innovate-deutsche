import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { LanguageSelector, languageOptions } from "../LanguageSelector";
import { useApp } from "../../state/useApp";
import bank from "../../../../data/question_bank/questions.json";
import i18n from "../../i18n";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

it("offers exactly the three question bank languages and selects Spanish", () => {
  expect(languageOptions.map((option) => option.code).sort()).toEqual(
    Object.keys(bank.speech).sort(),
  );
  const screen = render(<LanguageSelector />);
  expect(screen.getAllByRole("radio")).toHaveLength(3);
  fireEvent.press(screen.getByRole("radio", { name: "Español" }));
  expect(useApp.getState().language).toBe("es");
  expect(
    screen.getByRole("radio", { name: "Español" }).props.accessibilityState
      .checked,
  ).toBe(true);
});

it("has matching translation keys in each supported language", () => {
  const keys = (language: string) =>
    Object.keys(i18n.getResourceBundle(language, "translation")).sort();
  expect(keys("es")).toEqual(keys("en"));
  expect(keys("sw")).toEqual(keys("en"));
  expect(i18n.getResource("es", "translation", "language")).toBe(
    "Elige tu idioma",
  );
});

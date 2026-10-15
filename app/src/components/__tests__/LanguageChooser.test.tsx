import React from "react";
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { LanguageChooser } from "../LanguageChooser";
import { ensureLearner } from "../../api/learner";
import { useApp } from "../../state/useApp";
import "../../i18n";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);
jest.mock("expo-router", () => ({ useFocusEffect: jest.fn() }));
jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock("../../api/learner", () => ({
  ...jest.requireActual("../../api/learner"),
  ensureLearner: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  useApp.setState({
    ...useApp.getInitialState(),
    country: "KE",
    language: "en",
  });
});

it("offers supported languages and saves the chosen language", async () => {
  jest.mocked(ensureLearner).mockResolvedValue("u_existing");
  const client = new QueryClient();
  const invalidate = jest.spyOn(client, "invalidateQueries");
  await render(
    <QueryClientProvider client={client}>
      <LanguageChooser />
    </QueryClientProvider>,
  );

  expect(screen.queryByRole("button", { name: "Deutsch" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Kiswahili" }));

  await waitFor(() => expect(ensureLearner).toHaveBeenCalled());
  expect(useApp.getState().language).toBe("sw");
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["lesson"] });
});

it("restores the previous language and shows an error if saving fails", async () => {
  jest.mocked(ensureLearner).mockRejectedValue(new Error("offline"));
  const client = new QueryClient();
  await render(
    <QueryClientProvider client={client}>
      <LanguageChooser />
    </QueryClientProvider>,
  );

  await fireEvent.press(screen.getByRole("button", { name: "Kiswahili" }));

  await waitFor(() =>
    expect(
      screen.getByText(
        "This lesson could not load. Check your connection and try again.",
      ),
    ).toBeTruthy(),
  );
  expect(useApp.getState().language).toBe("en");
});

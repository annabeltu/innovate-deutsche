import React from "react";
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import Ask from "../Ask";
import { apiRequest } from "../../api/client";
import { ensureLearner } from "../../api/learner";
import { useApp } from "../../state/useApp";
import "../../i18n";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);
jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
  useFocusEffect: jest.fn(),
}));
jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock("../../api/client", () => ({
  ...jest.requireActual("../../api/client"),
  apiRequest: jest.fn(),
}));
jest.mock("../../api/learner", () => ({
  ...jest.requireActual("../../api/learner"),
  ensureLearner: jest.fn(),
}));
// The recorder hands its transcript to the screen; capture that callback.
let mockOnTranscript: (text: string) => void = () => {};
jest.mock("../../voice/use-kiko-recorder", () => ({
  useKikoRecorder: (onText: (text: string) => void) => {
    mockOnTranscript = onText;
    return {
      record: jest.fn(),
      isRecording: false,
      busy: false,
      error: "",
    };
  },
}));

const ORIGINAL_API_URL = process.env.EXPO_PUBLIC_API_URL;
beforeAll(() => {
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});
afterAll(() => {
  process.env.EXPO_PUBLIC_API_URL = ORIGINAL_API_URL;
});

async function showAsk() {
  jest.clearAllMocks();
  useApp.setState({ ...useApp.getInitialState() });
  jest.mocked(ensureLearner).mockResolvedValue("u_live");
  jest.mocked(apiRequest).mockImplementation(async (path) => {
    if (path === "/v1/bonus-lessons")
      return {
        generated: true,
        matched_topic: null,
        lesson: { title: "Insurance", lesson_id: "bonus_real" },
      };
    throw new Error("askScreen.connectionError");
  });
  const client = new QueryClient({
    defaultOptions: { mutations: { gcTime: Infinity } },
  });
  await render(
    <QueryClientProvider client={client}>
      <Ask />
    </QueryClientProvider>,
  );
}

async function turnIntoLesson() {
  await fireEvent.press(
    screen.getByRole("button", { name: "✦ Turn this into a lesson" }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "✓ Added to your roadmap" }),
    ).toBeTruthy(),
  );
}

it("turns a typed question into a real generated lesson for the roadmap", async () => {
  await showAsk();

  await fireEvent.changeText(
    screen.getByLabelText("Your question for Kiko"),
    "Teach me insurance",
  );
  await turnIntoLesson();

  expect(apiRequest).toHaveBeenCalledWith("/v1/bonus-lessons", {
    method: "POST",
    body: { user_id: "u_live", request: "Teach me insurance" },
  });
  expect(useApp.getState().bonusLessonIds.Insurance).toBe("bonus_real");
});

it("offers the same real lesson for a recorded question", async () => {
  await showAsk();

  await act(async () => mockOnTranscript("Teach me insurance"));
  expect(screen.getByDisplayValue("Teach me insurance")).toBeTruthy();
  await turnIntoLesson();

  expect(apiRequest).toHaveBeenCalledWith("/v1/bonus-lessons", {
    method: "POST",
    body: { user_id: "u_live", request: "Teach me insurance" },
  });
});

it("shows a connection error right under the question, above the example link", async () => {
  await showAsk();

  await fireEvent.changeText(
    screen.getByLabelText("Your question for Kiko"),
    "How do I save?",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Ask Kiko →" }));
  const error = await screen.findByRole("alert");

  const tree = JSON.stringify(screen.toJSON());
  expect(error).toBeTruthy();
  expect(tree.indexOf("Kiko could not connect")).toBeLessThan(
    tree.indexOf("Try an example conversation"),
  );
});

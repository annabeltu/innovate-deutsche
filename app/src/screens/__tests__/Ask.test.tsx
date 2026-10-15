import React from "react";
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import Ask from "../Ask";
import { router } from "expo-router";
import { apiRequest } from "../../api/client";
import { ensureLearner } from "../../api/learner";
import { recognizeIntent } from "../../api/voice";
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
jest.mock("../../api/voice", () => ({ recognizeIntent: jest.fn() }));
jest.mock("../../components/VoiceInput", () => {
  const { Button, View } = jest.requireActual("react-native");
  return {
    VoiceInput: ({ onText }: { onText: (text: string) => Promise<void> }) => (
      <View>
        {["insurance", "yes", "no", "back", "help", "next"].map((text) => (
          <Button
            key={text}
            title={`Say ${text}`}
            onPress={() => onText(text)}
          />
        ))}
      </View>
    ),
  };
});

it("submits a typed question and stores the real generated lesson for the roadmap", async () => {
  useApp.setState({ ...useApp.getInitialState() });
  jest.mocked(ensureLearner).mockResolvedValue("u_live");
  jest.mocked(apiRequest).mockResolvedValue({
    generated: true,
    matched_topic: null,
    lesson: { title: "Insurance", lesson_id: "bonus_real" },
  });
  const client = new QueryClient({
    defaultOptions: { mutations: { gcTime: Infinity } },
  });
  await render(
    <QueryClientProvider client={client}>
      <Ask />
    </QueryClientProvider>,
  );

  await fireEvent.changeText(
    screen.getByLabelText("Ask me any money question now."),
    "Teach me insurance",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "✦ Turn this into a lesson" }),
  );

  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "✓ Added to your roadmap" }),
    ).toBeTruthy(),
  );
  expect(apiRequest).toHaveBeenCalledWith("/v1/bonus-lessons", {
    method: "POST",
    body: { user_id: "u_live", request: "Teach me insurance" },
  });
  expect(useApp.getState().bonusLessonIds.Insurance).toBe("bonus_real");
  // The screen already has one roadmap button; a new lesson must not add another.
  expect(
    screen.getAllByRole("button", { name: "See my roadmap" }),
  ).toHaveLength(1);
  expect(recognizeIntent).not.toHaveBeenCalled();
});

async function showVoiceAsk() {
  jest.clearAllMocks();
  useApp.setState({ ...useApp.getInitialState(), readAloud: true });
  jest.mocked(ensureLearner).mockResolvedValue("u_voice");
  jest.mocked(apiRequest).mockResolvedValue({
    generated: true,
    matched_topic: null,
    lesson: { title: "Insurance", lesson_id: "bonus_voice" },
  });
  jest.mocked(recognizeIntent).mockImplementation(async (text) => ({
    intent: ["yes", "no", "back", "help", "next"].includes(text)
      ? (text as "yes" | "no" | "back" | "help" | "next")
      : "unknown",
    option_id: null,
    number: null,
    confidence: 1,
    normalized_text: text,
  }));
  const client = new QueryClient({
    defaultOptions: { mutations: { gcTime: Infinity } },
  });
  await render(
    <QueryClientProvider client={client}>
      <Ask />
    </QueryClientProvider>,
  );
}

it("requires spoken confirmation before generating a recorded request", async () => {
  await showVoiceAsk();
  await fireEvent.press(screen.getByRole("button", { name: "Say insurance" }));
  expect(apiRequest).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Say yes" }));
  await waitFor(() =>
    expect(useApp.getState().bonusLessonIds.Insurance).toBe("bonus_voice"),
  );
  expect(apiRequest).toHaveBeenCalledWith("/v1/bonus-lessons", {
    method: "POST",
    body: { user_id: "u_voice", request: "insurance" },
  });
  await fireEvent.press(screen.getByRole("button", { name: "Say next" }));
  expect(router.replace).toHaveBeenCalledWith("/roadmap");
});

it("honors no, help and back without creating a lesson", async () => {
  await showVoiceAsk();
  await fireEvent.press(screen.getByRole("button", { name: "Say help" }));
  await fireEvent.press(screen.getByRole("button", { name: "Say insurance" }));
  await fireEvent.press(screen.getByRole("button", { name: "Say no" }));
  expect(
    screen.getByLabelText("Ask me any money question now.").props.value,
  ).toBe("");
  await fireEvent.press(screen.getByRole("button", { name: "Say back" }));
  expect(router.replace).toHaveBeenCalledWith("/roadmap");
  expect(apiRequest).not.toHaveBeenCalled();
});

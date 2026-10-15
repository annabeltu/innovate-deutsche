import React from "react";
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, fireEvent } from "@testing-library/react-native";
import { Roadmap, Shop, Practice, Leagues, Success } from "../Journey";
import { useApp as mockUseApp } from "../../state/useApp";
import i18n from "../../i18n";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({ rewarded: "true" }),
}));
jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock("../../api/learner", () => ({
  ...jest.requireActual("../../api/learner"),
  ensureLearner: jest.fn().mockResolvedValue("u_test"),
}));
jest.mock("../../api/path", () => ({
  usePath: () => ({
    isPending: false,
    isError: false,
    data: {
      lessons: [{ lesson_id: "saving", topic: "saving", completed: false }],
    },
  }),
}));
jest.mock("../../api/lessons", () => ({
  ...jest.requireActual("../../api/lessons"),
  useBonusLessons: () => [
    {
      data: {
        title: { en: "Insurance", es: "Seguros", sw: "Bima" }[
          mockUseApp.getState().language
        ],
      },
    },
  ],
}));
// No microphone is requested by these tab-only tests.
jest.mock("../../components/VoiceInput", () => ({ VoiceInput: () => null }));

beforeEach(async () => {
  await i18n.changeLanguage("en");
  mockUseApp.setState({
    ...mockUseApp.getInitialState(),
    country: "MX",
    completed: ["saving"],
    coins: 100,
    simple: true,
    bonus: ["Old English title"],
    bonusLessonIds: { "Old English title": "bonus_saved" },
  });
});

async function show(Component: React.ComponentType) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
  await render(
    <QueryClientProvider client={client}>
      <Component />
    </QueryClientProvider>,
  );
}

it.each([
  [Roadmap, "Money basics", "Conceptos básicos del dinero", "Misingi ya pesa"],
  [Shop, "Streak Freeze", "Protección de racha", "Kinga ya mfululizo"],
  [
    Practice,
    "Practice makes progress.",
    "Practicar te ayuda a avanzar.",
    "Mazoezi huleta maendeleo.",
  ],
  [
    Leagues,
    "Small wins add up.",
    "Los pequeños logros se suman.",
    "Mafanikio madogo huleta mafanikio makubwa.",
  ],
  [Success, "Nice!", "¡Muy bien!", "Vizuri!"],
] as const)(
  "updates mounted %p content and tabs when the language changes",
  async (Component, english, spanish, swahili) => {
    await show(Component);
    expect(screen.getByText(english)).toBeTruthy();
    await act(() => mockUseApp.getState().set({ language: "es" }));
    expect(screen.getByText(spanish)).toBeTruthy();
    expect(screen.queryByText(english)).toBeNull();
    await act(() =>
      mockUseApp.getState().set({ language: "sw", country: "KE" }),
    );
    expect(screen.getByText(swahili)).toBeTruthy();
    expect(screen.queryByText(spanish)).toBeNull();
  },
);

it("retranslates existing purchase feedback without requiring another purchase", async () => {
  await show(Shop);
  await fireEvent.press(
    screen.getByRole("button", { name: "Extra Heart, 60 coins, Available" }),
  );
  expect(
    screen.getByText("Extra Heart added to your collection!"),
  ).toBeTruthy();
  await act(() => mockUseApp.getState().set({ language: "es" }));
  expect(
    screen.getByText("¡Corazón extra se añadió a tu colección!"),
  ).toBeTruthy();
  expect(
    screen.queryByText("Extra Heart added to your collection!"),
  ).toBeNull();
});

it("never shows a persisted old-language bonus title after switching", async () => {
  await show(Roadmap);
  await act(() => mockUseApp.getState().set({ language: "sw", country: "KE" }));
  expect(screen.getByText("Bima")).toBeTruthy();
  expect(screen.queryByText("Old English title")).toBeNull();
  expect(screen.queryByText("Insurance")).toBeNull();
});

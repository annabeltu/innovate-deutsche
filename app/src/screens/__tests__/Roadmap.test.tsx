import React from "react";
import { render, screen } from "@testing-library/react-native";
import { Roadmap } from "../Journey";
import { usePath } from "../../api/path";
import { useApp } from "../../state/useApp";
import i18n from "../../i18n";

jest.mock("../../api/path", () => ({ usePath: jest.fn() }));
jest.mock("../../api/lessons", () => ({
  useBonusLessons: () => [],
  serverLessonId: jest.fn(),
}));
jest.mock("../../components/LanguageChooser", () => ({
  LanguageChooser: () => null,
}));
jest.mock("lottie-react-native", () => "LottieView");
jest.mock("../../components/ApiLesson", () => ({ ApiLesson: () => null }));
jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

const mockedUsePath = usePath as jest.Mock;

beforeEach(async () => {
  useApp.getState().set({ ...useApp.getInitialState(), language: "en" });
  await i18n.changeLanguage("en");
});

it("marks only the first open lesson as up next", async () => {
  mockedUsePath.mockReturnValue({
    isPending: false,
    isError: false,
    data: {
      lessons: [
        { lesson_id: "saving", topic: "saving", completed: true },
        { lesson_id: "budget", topic: "budget", completed: false },
        { lesson_id: "scams", topic: "scams", completed: false },
      ],
    },
  });
  await render(<Roadmap />);
  expect(screen.getAllByText("Up next")).toHaveLength(1);
});

it("lets Kiko explain a path that failed to load", async () => {
  mockedUsePath.mockReturnValue({
    isPending: false,
    isError: true,
    refetch: jest.fn(),
  });
  await render(<Roadmap />);
  expect(
    screen.getByRole("button", {
      name: "Your path couldn't load. Check your connection and try again.",
    }),
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
});

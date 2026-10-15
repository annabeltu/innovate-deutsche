import React from "react";
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import { render, screen } from "@testing-library/react-native";
import { BonusLessons } from "../BonusLessons";
import { ApiError } from "../../api/client";
import { useBonusLessons } from "../../api/lessons";
import { useApp } from "../../state/useApp";
import "../../i18n";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("../../api/lessons", () => ({ useBonusLessons: jest.fn() }));

beforeEach(() => {
  useApp.setState({
    ...useApp.getInitialState(),
    language: "en",
    bonus: ["Old learner's lesson", "Save for a bike"],
  });
});

it("hides a bonus lesson the API no longer has instead of showing an error", async () => {
  jest.mocked(useBonusLessons).mockReturnValue([
    {
      isError: true,
      error: new ApiError(404, "lesson_not_found", "No lesson bonus_old"),
      fetchStatus: "idle",
    },
    { data: { title: "Save for a bike" }, isError: false, fetchStatus: "idle" },
  ] as unknown as ReturnType<typeof useBonusLessons>);

  await render(<BonusLessons />);

  expect(screen.getByRole("button", { name: "Save for a bike" })).toBeTruthy();
  expect(screen.queryByText(/This lesson could not load/)).toBeNull();
  expect(screen.getAllByRole("button")).toHaveLength(1);
});

it("still explains a lesson that failed for another reason so it can be retried", async () => {
  jest.mocked(useBonusLessons).mockReturnValue([
    {
      isError: true,
      error: new ApiError(503, "service_unavailable", "Down"),
      fetchStatus: "idle",
    },
    { data: { title: "Save for a bike" }, isError: false, fetchStatus: "idle" },
  ] as unknown as ReturnType<typeof useBonusLessons>);

  await render(<BonusLessons />);

  expect(screen.getByText(/This lesson could not load/)).toBeTruthy();
});

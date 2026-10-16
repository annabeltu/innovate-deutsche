import { Roadmap } from "../Roadmap";
import React from "react";
import { render, fireEvent, within } from "@testing-library/react-native";
import { PersonalizedPath } from "../PersonalizedPath";
import { Confidence } from "../Confidence";
import { useApp } from "../../state/useApp";
import { router } from "expo-router";

jest.mock("../../api/path", () => ({
  usePath: () => ({
    isPending: false,
    isError: false,
    data: {
      lessons: [{ topic: "scams", lesson_id: "scams", completed: false }],
    },
  }),
}));
jest.mock("../../api/lessons", () => ({ useBonusLessons: () => [] }));
jest.mock("@expo/vector-icons", () => ({
  Feather: jest.requireActual("react-native").View,
}));
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("react-i18next", () => ({
  ...jest.requireActual("react-i18next"),
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("../../components/ui", () => {
  const { View, Text } = jest.requireActual("react-native");
  return {
    ...jest.requireActual("../../components/ui"),
    Screen: ({
      children,
      background,
      footer,
    }: {
      children: React.ReactNode;
      background: React.ReactNode;
      footer?: React.ReactNode;
    }) => (
      <View>
        {background}
        {children}
        {footer}
      </View>
    ),
    Txt: Text,
    Progress: View,
    Kiko: View,
    KikoNote: ({ message }: { message: string }) => <Text>{message}</Text>,
  };
});
jest.mock("@react-native-community/slider", () => {
  const { View } = jest.requireActual("react-native");
  return { __esModule: true, default: View };
});

it("moves a slider without changing other topics and opens the quiz", async () => {
  useApp.getState().set({ confidence: [0.1, 0.2, 0.3, 0.4, 0.5] });
  const screen = await render(<Confidence />);
  await fireEvent(
    screen.getByLabelText("confidenceTopics.saving"),
    "valueChange",
    5,
  );
  expect(useApp.getState().confidence).toEqual([0.1, 1, 0.3, 0.4, 0.5]);
  await fireEvent.press(screen.getByRole("button", { name: "build" }));
  expect(router.push).toHaveBeenCalledWith("/quiz");
  expect(useApp.getState().onboarded).toBe(false);
});

it.each([
  [1, 0],
  [2, 0.25],
  [3, 0.5],
  [4, 0.75],
  [5, 1],
])("maps rating %s to API confidence %s", async (rating, confidence) => {
  const screen = await render(<Confidence />);
  const slider = screen.getByLabelText("confidenceTopics.accounts");
  expect(slider.props.minimumValue).toBe(1);
  expect(slider.props.maximumValue).toBe(5);
  expect(slider.props.step).toBe(1);
  await fireEvent(slider, "valueChange", rating);
  expect(useApp.getState().confidence[0]).toBe(confidence);
  expect(
    screen.queryByText(String(rating), { includeHiddenElements: true }),
  ).toBeNull();
});

it("opens the roadmap from the personalized preview", async () => {
  useApp
    .getState()
    .set({ confidence: [0.75, 0.5, 1, 0, 0.25], onboarded: false });
  const screen = await render(<PersonalizedPath />);
  await fireEvent.press(
    screen.getByRole("button", { name: "pathPreview.start" }),
  );
  expect(router.push).toHaveBeenCalledWith("/roadmap");
  expect(useApp.getState().onboarded).toBe(true);
});

it("opens the current roadmap lesson and prevents opening locked lessons", async () => {
  useApp
    .getState()
    .set({ confidence: [0.75, 0.5, 1, 0, 0.25], completed: [], bonus: [] });
  const screen = await render(<Roadmap />);
  await fireEvent.press(
    screen.getByRole("button", {
      name: "confidenceTopics.scams. roadmapScreen.current",
    }),
  );
  expect(router.push).toHaveBeenLastCalledWith({
    pathname: "/lesson",
    params: { id: "scams" },
  });
  const locked = screen.getByRole("button", {
    name: "confidenceTopics.budget. roadmapScreen.locked",
  });
  expect(locked.props.accessibilityState.disabled).toBe(true);
  const count = jest.mocked(router.push).mock.calls.length;
  fireEvent.press(locked);
  expect(jest.mocked(router.push).mock.calls).toHaveLength(count);
});

it("draws the path curve behind the lesson nodes only, not the unit reward", async () => {
  useApp
    .getState()
    .set({ confidence: [0.75, 0.5, 1, 0, 0.25], completed: [], bonus: [] });
  const screen = await render(<Roadmap />);
  const pathArea = within(screen.getByTestId("roadmap-path"));

  expect(
    pathArea.getByRole("button", {
      name: "confidenceTopics.scams. roadmapScreen.current",
    }),
  ).toBeTruthy();
  expect(pathArea.queryByText("roadmapScreen.finishUnit")).toBeNull();
  expect(screen.getByText("roadmapScreen.finishUnit")).toBeTruthy();
});

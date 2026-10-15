import React from "react";
import { ScrollView, Text, View } from "react-native";
import { render } from "@testing-library/react-native";
import { Screen } from "../ui";

jest.mock("expo-router", () => ({ useFocusEffect: jest.fn(), router: {} }));
jest.mock("expo-speech", () => ({ stop: jest.fn(), speak: jest.fn() }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: jest.requireActual("react-native").View,
}));

it("lets the background fill the display while protecting scroll content from the notch", () => {
  const screen = render(
    <Screen compact background={<View testID="scenery" />}>
      <Text>Content</Text>
    </Screen>,
  );
  expect(screen.getByTestId("scenery")).toBeTruthy();
  const content =
    screen.UNSAFE_getByType(ScrollView).props.contentContainerStyle;
  expect(content.paddingTop).toBe(75);
  expect(content.paddingBottom).toBe(46);
  expect(
    screen
      .UNSAFE_getAllByType(View)
      .some((view) => view.props.style?.maxWidth === 540),
  ).toBe(false);
});
it("protects the fixed footer without adding a bottom gap to the scrolling content", () => {
  const screen = render(
    <Screen compact footer={<View testID="footer" />}>
      <Text>Content</Text>
    </Screen>,
  );
  expect(
    screen.UNSAFE_getByType(ScrollView).props.contentContainerStyle
      .paddingBottom,
  ).toBe(12);
  expect(
    screen
      .UNSAFE_getAllByType(View)
      .some((view) => view.props.style?.paddingBottom === 34),
  ).toBe(true);
});

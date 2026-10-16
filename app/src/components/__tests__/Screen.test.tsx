import React from "react";
import { Text, View } from "react-native";
import { render } from "@testing-library/react-native";
import { Nav, Screen } from "../ui";
import { layout, spacing } from "../../theme/tokens";

jest.mock("expo-router", () => ({ useFocusEffect: jest.fn(), router: {} }));
jest.mock("expo-speech", () => ({ stop: jest.fn(), speak: jest.fn() }));
jest.mock("react-i18next", () => ({
  ...jest.requireActual("react-i18next"),
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

it("lets the background fill the display while protecting scroll content from the notch", async () => {
  const screen = await render(
    <Screen compact background={<View testID="scenery" />}>
      <Text>Content</Text>
    </Screen>,
  );
  expect(screen.getByTestId("scenery")).toBeTruthy();
  const content =
    screen.getByTestId("screen-scroll").props.contentContainerStyle;
  expect(content.paddingTop).toBe(spacing.lg + 59);
  expect(content.paddingBottom).toBe(layout.sectionGap + 34);
  expect(JSON.stringify(screen.toJSON())).not.toContain('"maxWidth":540');
});
it("protects the fixed footer without adding a bottom gap to the scrolling content", async () => {
  const screen = await render(
    <Screen compact footer={<Nav />}>
      <Text>Content</Text>
    </Screen>,
  );
  expect(
    screen.getByTestId("screen-scroll").props.contentContainerStyle
      .paddingBottom,
  ).toBe(layout.sectionGap);
  // The tab bar's own background covers the home indicator area, flush to
  // the bottom edge, instead of padding outside it.
  expect(screen.getByTestId("screen-footer")).not.toHaveStyle({
    paddingBottom: 34,
  });
  expect(screen.getByTestId("tab-bar")).toHaveStyle({
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  });
});

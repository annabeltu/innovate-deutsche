import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Shop } from "../Shop";
import { BonusNotification } from "../../components/BonusNotification";
import { useApp } from "../../state/useApp";
import { TRANSFER_LESSON } from "../../shop/catalog";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));
jest.mock("react-i18next", () => ({
  ...jest.requireActual("react-i18next"),
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("@expo/vector-icons", () => ({
  Feather: jest.requireActual("react-native").View,
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("../../components/ui", () => {
  const { View } = jest.requireActual("react-native");
  return {
    ...jest.requireActual("../../components/ui"),
    Screen: ({
      children,
      footer,
    }: {
      children: React.ReactNode;
      footer?: React.ReactNode;
    }) => (
      <View>
        {children}
        {footer}
      </View>
    ),
  };
});
beforeEach(() =>
  useApp.getState().set({
    coins: 500,
    hearts: 5,
    purchases: [],
    bonus: [],
    pendingBonus: null,
    equippedOutfit: null,
  }),
);
it("buys a heart from the designed shop", async () => {
  const screen = await render(<Shop />);
  await fireEvent.press(
    screen.getByRole("button", {
      name: "shopScreen.items.heart.title. shopScreen.price",
    }),
  );
  expect(useApp.getState().coins).toBe(400);
  expect(useApp.getState().hearts).toBe(6);
});
it("buys and equips an outfit", async () => {
  const screen = await render(<Shop />);
  await fireEvent.press(
    screen.getByRole("button", {
      name: "shopScreen.items.outfit-europe.title. shopScreen.price",
    }),
  );
  await fireEvent.press(
    screen.getByRole("button", {
      name: "shopScreen.items.outfit-europe.title. shopScreen.owned",
    }),
  );
  expect(useApp.getState().equippedOutfit).toBe("outfit-europe");
});
it("dismisses the new lesson toast without deleting the lesson", async () => {
  useApp.getState().addBonus(TRANSFER_LESSON);
  const screen = await render(<BonusNotification />);
  expect(screen.getByText("experience.newLesson")).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: "experience.dismiss" }),
  );
  expect(screen.queryByText("experience.newLesson")).toBeNull();
  expect(useApp.getState().bonus).toEqual([TRANSFER_LESSON]);
});

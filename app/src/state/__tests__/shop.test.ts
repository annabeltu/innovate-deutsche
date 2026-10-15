import { useApp } from "../useApp";
import { TRANSFER_LESSON } from "../../shop/catalog";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
beforeEach(() =>
  useApp
    .getState()
    .set({
      coins: 500,
      hearts: 5,
      purchases: [],
      bonus: [],
      pendingBonus: null,
      equippedOutfit: null,
    }),
);
it("charges the catalog price and adds one heart, once", () => {
  expect(useApp.getState().buy("heart", 1)).toBe(false);
  expect(useApp.getState().buy("heart", 100)).toBe(true);
  expect(useApp.getState().coins).toBe(400);
  expect(useApp.getState().hearts).toBe(6);
  expect(useApp.getState().buy("heart", 100)).toBe(false);
});
it("rejects purchases without enough coins", () => {
  useApp.getState().set({ coins: 49 });
  expect(useApp.getState().buy("freeze", 50)).toBe(false);
  expect(useApp.getState().purchases).toEqual([]);
});
it("equips only purchased outfits", () => {
  useApp.getState().equipOutfit("outfit-africa");
  expect(useApp.getState().equippedOutfit).toBeNull();
  useApp.getState().buy("outfit-africa", 150);
  useApp.getState().equipOutfit("outfit-africa");
  expect(useApp.getState().equippedOutfit).toBe("outfit-africa");
});
it("atomically unlocks the bonus lesson and publishes a dismissible notice", () => {
  expect(useApp.getState().buy("transfer", 200)).toBe(true);
  expect(useApp.getState().coins).toBe(300);
  expect(useApp.getState().bonus).toEqual([TRANSFER_LESSON]);
  expect(useApp.getState().pendingBonus).toBe(TRANSFER_LESSON);
  useApp.getState().dismissBonus();
  expect(useApp.getState().pendingBonus).toBeNull();
  expect(useApp.getState().bonus).toEqual([TRANSFER_LESSON]);
  expect(useApp.getState().buy("transfer", 200)).toBe(false);
});
it("never charges for a lesson already added through Ask Kiko", () => {
  useApp.getState().addBonus(TRANSFER_LESSON);
  useApp.getState().dismissBonus();
  useApp.getState().addBonus(TRANSFER_LESSON);
  expect(useApp.getState().pendingBonus).toBeNull();
  expect(useApp.getState().buy("transfer", 200)).toBe(false);
  expect(useApp.getState().coins).toBe(500);
});
it("migrates existing balances without creating an old notification", async () => {
  const migrate = useApp.persist.getOptions().migrate;
  if (!migrate) throw new Error("Missing persistence migration");
  const state = await migrate(
    { coins: 80, purchases: ["heart"], country: "US", language: "en" },
    2,
  );
  expect(state).toMatchObject({
    coins: 80,
    purchases: ["heart"],
    pendingBonus: null,
    equippedOutfit: null,
  });
});

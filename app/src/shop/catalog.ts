export const TRANSFER_LESSON = "i18n:shopScreen.transferTitle";
export const TRANSFER_ITEM = {
  id: "transfer",
  price: 200,
  section: "lessons",
  art: "globe",
} as const;
export const shopCatalog = [
  { id: "freeze", price: 50, section: "essentials", art: "freeze" },
  { id: "heart", price: 100, section: "essentials", art: "heart" },
  { id: "outfit-asia", price: 150, section: "outfits", art: "asia" },
  { id: "outfit-africa", price: 150, section: "outfits", art: "africa" },
  { id: "outfit-europe", price: 150, section: "outfits", art: "europe" },
  TRANSFER_ITEM,
] as const;
export type ShopItem = (typeof shopCatalog)[number];
export type OutfitId = "outfit-asia" | "outfit-africa" | "outfit-europe";

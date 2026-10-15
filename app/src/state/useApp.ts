import { shopCatalog, TRANSFER_LESSON, type OutfitId } from "../shop/catalog";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
export type Language = "en" | "es" | "sw";
export type Country = "US" | "MX" | "KE";
type State = {
  language: Language;
  country: Country;
  stage: string;
  goal: string;
  comfort: number;
  confidence: number[];
  readAloud: boolean;
  simple: boolean;
  large: boolean;
  onboarded: boolean;
  coins: number;
  hearts: number;
  streak: number;
  completed: string[];
  purchases: string[];
  bonus: string[];
  pendingBonus: string | null;
  equippedOutfit: OutfitId | null;
  equipOutfit: (id: OutfitId) => void;
  dismissBonus: () => void;
  set: (
    value: Partial<
      Omit<
        State,
        "set" | "complete" | "buy" | "addBonus" | "equipOutfit" | "dismissBonus"
      >
    >,
  ) => void;
  complete: (id: string) => void;
  buy: (id: string, price: number) => boolean;
  addBonus: (title: string) => void;
};
export const useApp = create<State>()(
  persist(
    (set, get) => ({
      language: "en",
      country: "US",
      stage: "First job",
      goal: "Save more",
      comfort: 0.4,
      confidence: [0.45, 0.6, 0.3, 0.2, 0.8],
      readAloud: false,
      simple: false,
      large: false,
      onboarded: false,
      coins: 240,
      hearts: 5,
      streak: 7,
      completed: [],
      purchases: [],
      bonus: [],
      pendingBonus: null,
      equippedOutfit: null,
      equipOutfit: (id) => {
        if (get().purchases.includes(id)) set({ equippedOutfit: id });
      },
      dismissBonus: () => set({ pendingBonus: null }),
      set: (value) => set(value),
      complete: (id) => {
        if (!get().completed.includes(id))
          set((s) => ({
            completed: [...s.completed, id],
            coins: s.coins + 10,
          }));
      },
      buy: (id, price) => {
        const state = get();
        const item = shopCatalog.find((candidate) => candidate.id === id);
        if (
          !item ||
          item.price !== price ||
          state.coins < price ||
          state.purchases.includes(id) ||
          (id === "transfer" && state.bonus.includes(TRANSFER_LESSON))
        )
          return false;
        set({
          coins: state.coins - price,
          purchases: [...state.purchases, id],
          hearts: id === "heart" ? state.hearts + 1 : state.hearts,
          bonus:
            id === "transfer" ? [...state.bonus, TRANSFER_LESSON] : state.bonus,
          pendingBonus:
            id === "transfer" ? TRANSFER_LESSON : state.pendingBonus,
        });
        return true;
      },
      addBonus: (title) => {
        if (!get().bonus.includes(title))
          set((s) => ({ bonus: [...s.bonus, title], pendingBonus: title }));
      },
    }),
    {
      name: "kompass-v1",
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      migrate: (persisted) => {
        const state = persisted as Partial<State>;
        return {
          ...state,
          pendingBonus: state.pendingBonus ?? null,
          equippedOutfit: state.equippedOutfit ?? null,
          language: ["en", "es", "sw"].includes(state.language ?? "")
            ? state.language
            : "en",
          country: ["US", "MX", "KE"].includes(state.country ?? "")
            ? state.country
            : "US",
        };
      },
    },
  ),
);

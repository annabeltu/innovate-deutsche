import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
export type Language = "en" | "es" | "sw";
export type Country = "US" | "MX" | "KE";
type State = {
  language: Language;
  /** False until the learner picks a language; the welcome screen cycles until then. */
  languageChosen: boolean;
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
  set: (
    value: Partial<Omit<State, "set" | "complete" | "buy" | "addBonus">>,
  ) => void;
  complete: (id: string) => void;
  buy: (id: string, price: number) => boolean;
  addBonus: (title: string) => void;
};
export const useApp = create<State>()(
  persist(
    (set, get) => ({
      language: "en",
      languageChosen: false,
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
      set: (value) => set(value),
      complete: (id) => {
        if (!get().completed.includes(id))
          set((s) => ({
            completed: [...s.completed, id],
            coins: s.coins + 10,
          }));
      },
      buy: (id, price) => {
        const s = get();
        if (s.coins < price || s.purchases.includes(id)) return false;
        set({
          coins: s.coins - price,
          purchases: [...s.purchases, id],
          hearts: id === "heart" ? s.hearts + 1 : s.hearts,
        });
        return true;
      },
      addBonus: (title) => {
        if (!get().bonus.includes(title))
          set((s) => ({ bonus: [...s.bonus, title] }));
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
          // Anyone who already used the app has been through language setup.
          languageChosen: state.languageChosen ?? true,
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

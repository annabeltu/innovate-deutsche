import { create } from "zustand";

type NarrationState = {
  /** Everything the screen in view says, in the learner's language. */
  text: string;
  /** True while read-aloud audio is playing, so controls can offer "stop". */
  speaking: boolean;
  setText: (text: string) => void;
  setSpeaking: (speaking: boolean) => void;
};

/**
 * What the read-aloud bubble should read. Screens register their text when
 * they come into view. This is screen state, not learner progress, so it is
 * deliberately not persisted.
 */
export const useNarration = create<NarrationState>()((set) => ({
  text: "",
  speaking: false,
  setText: (text) => set({ text }),
  setSpeaking: (speaking) => set({ speaking }),
}));

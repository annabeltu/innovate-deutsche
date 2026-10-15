import type { Country, Language } from "@/src/types/api";

// expo-speech picks a voice from an IETF tag. Prefer the learner's regional accent;
// devices without that voice fall back to any voice for the language.
const SPEECH_LOCALES: Record<Country, Partial<Record<Language, string>>> = {
  US: { en: "en-US", es: "es-US" },
  MX: { es: "es-MX", en: "en-US" },
  KE: { en: "en-KE", sw: "sw-KE" },
};

/** The text-to-speech language tag for a learner, e.g. `sw-KE`. */
export function speechLocale(language: Language, country: Country): string {
  return SPEECH_LOCALES[country][language] ?? language;
}

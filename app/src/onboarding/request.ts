import type { OnboardingRequest, Topic } from "../types/api";

export const topics: Topic[] = [
  "accounts",
  "saving",
  "borrowing",
  "scams",
  "budget",
];
const stages = {
  Student: "student",
  "First job": "first_job",
  Parent: "parent",
  Retired: "retired",
} as const;

/** Convert persisted frontend choices to the existing onboarding contract. */
export function buildOnboardingRequest(state: {
  country: OnboardingRequest["country"];
  language: string;
  stage: string;
  confidence: number[];
  comfort: number;
  readAloud: boolean;
  simple: boolean;
  large: boolean;
}): OnboardingRequest {
  if (!["en", "es", "sw"].includes(state.language))
    throw new Error("unsupportedLanguage");
  if (state.language === "sw" && state.country !== "KE")
    throw new Error("unsupportedLanguage");
  if (state.language === "es" && state.country === "KE")
    throw new Error("unsupportedLanguage");
  return {
    country: state.country,
    language: state.language as OnboardingRequest["language"],
    life_stage: stages[state.stage as keyof typeof stages] ?? "first_job",
    goal: "save_more",
    savings_habit: "none",
    comfort: state.comfort < 0.4 ? 1 : state.comfort < 0.7 ? 2 : 3,
    confidence: Object.fromEntries(
      topics.map((topic, index) => [topic, state.confidence[index] ?? 0.5]),
    ) as Record<Topic, number>,
    accessibility: {
      read_aloud: state.readAloud,
      voice_mode: state.readAloud,
      simple_mode: state.simple,
      large_text: state.large,
    },
  };
}

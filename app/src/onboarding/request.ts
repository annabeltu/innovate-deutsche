import { toOnboardingRequest } from "../api/learner";
import type { OnboardingRequest, Topic } from "../types/api";

export const topics: Topic[] = [
  "accounts",
  "saving",
  "borrowing",
  "scams",
  "budget",
];
/** Convert persisted frontend choices to the existing onboarding contract. */
export function buildOnboardingRequest(state: {
  country: OnboardingRequest["country"];
  language: string;
  stage: string;
  goal?: string;
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
  return toOnboardingRequest({ ...state, goal: state.goal ?? "Save more" });
}

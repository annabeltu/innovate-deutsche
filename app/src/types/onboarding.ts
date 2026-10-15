import type { OnboardingRequest } from "./api";
// Onboarding types. Owner: Data & content (Taran).
// OnboardingState is what the UI collects; OnboardingPayload is the JSON sent
// to the onboarding API. Keep the two separate so the API shape can change
// without touching screens.

export const COUNTRY_CODES = ["US", "MX", "KE"] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export const LANGUAGE_CODES = ["en", "es", "sw"] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export const LIFE_STAGES = [
  "student",
  "first_job",
  "parent",
  "retired",
] as const;
export type LifeStage = (typeof LIFE_STAGES)[number];

export const GOALS = [
  "save_more",
  "avoid_debt",
  "stay_safe_online",
  "handle_emergencies",
] as const;
export type Goal = (typeof GOALS)[number];

export const COMFORT_LEVELS = [
  "beginner",
  "somewhat_comfortable",
  "confident",
] as const;
export type ComfortLevel = (typeof COMFORT_LEVELS)[number];

// Topic ids match the `topic` enum in docs/API_CONTRACTS.md.
export const TOPICS = [
  "accounts",
  "saving",
  "borrowing",
  "scams",
  "budget",
] as const;
export type Topic = (typeof TOPICS)[number];

/** Self-reported confidence from a 1–5 slider. Not a weakness score. */
export type ConfidenceScore = 1 | 2 | 3 | 4 | 5;

export type AccessibilityPreferences = {
  readAloud: boolean;
  simpleMode: boolean;
  largerText: boolean;
};

/**
 * Raw onboarding answers held by the UI while the user is answering.
 * `null` means "not answered yet".
 */
export type OnboardingState = {
  country: CountryCode | null;
  language: LanguageCode | null;
  accessibility: AccessibilityPreferences;
  lifeStage: LifeStage | null;
  goal: Goal | null;
  comfort: ComfortLevel | null;
  confidence: Record<Topic, number | null>;
};

/** Validated API payload; UI-only scales are converted by buildOnboardingPayload. */
export type OnboardingPayload = OnboardingRequest;

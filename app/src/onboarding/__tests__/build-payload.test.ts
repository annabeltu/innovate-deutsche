import {
  buildOnboardingPayload,
  createInitialOnboardingState,
  normalizeConfidence,
} from "../build-payload";
import type { OnboardingState } from "../../types/onboarding";
import kenya from "../../../../data/fixtures/onboarding/KE.json";

const answered: OnboardingState = {
  country: "KE",
  language: "sw",
  lifeStage: "parent",
  goal: "handle_emergencies",
  comfort: "confident",
  accessibility: { readAloud: true, simpleMode: true, largerText: true },
  confidence: { accounts: 5, saving: 4, borrowing: 2, scams: 2, budget: 3 },
};

it("starts with unanswered options rather than preset responses", () => {
  const initial = createInitialOnboardingState();
  expect(initial.country).toBeNull();
  expect(initial.goal).toBeNull();
  expect(initial.lifeStage).toBeNull();
  expect(Object.values(initial.confidence)).toEqual([
    null,
    null,
    null,
    null,
    null,
  ]);
  expect(buildOnboardingPayload(initial).ok).toBe(false);
});

it("converts the new UI state into the exact API-ready country fixture", () => {
  expect(buildOnboardingPayload(answered)).toEqual({
    ok: true,
    payload: kenya,
  });
});

it.each([
  [1, 0],
  [2, 0.25],
  [3, 0.5],
  [4, 0.75],
  [5, 1],
] as const)("normalizes confidence %s to %s", (input, output) => {
  expect(normalizeConfidence(input)).toBe(output);
});

it("rejects an unavailable country/language pair", () => {
  expect(buildOnboardingPayload({ ...answered, country: "US" }).ok).toBe(false);
});

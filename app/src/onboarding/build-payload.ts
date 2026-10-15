import { getCountry } from '@/src/onboarding/countries';
import { CONFIDENCE_MAX, CONFIDENCE_MIN } from '@/src/onboarding/options';
import {
  COMFORT_LEVELS,
  GOALS,
  LIFE_STAGES,
  TOPICS,
  type ConfidenceScore,
  type OnboardingPayload,
  type OnboardingState,
  type Topic,
} from '@/src/types/onboarding';

export type OnboardingField =
  'country' | 'language' | 'lifeStage' | 'goal' | 'comfort' | `confidence.${Topic}`;

export type OnboardingError = { field: OnboardingField; message: string };

export type OnboardingResult =
  { ok: true; payload: OnboardingPayload } | { ok: false; errors: OnboardingError[] };

/** A fresh state for the start of onboarding: nothing answered, all accessibility off. */
export function createInitialOnboardingState(): OnboardingState {
  return {
    country: null,
    language: null,
    accessibility: { readAloud: false, simpleMode: false, largerText: false },
    lifeStage: null,
    goal: null,
    comfort: null,
    confidence: { accounts: null, saving: null, borrowing: null, scams: null, budget: null },
  };
}

function isOneOf<T extends string>(allowed: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

function isConfidenceScore(value: unknown): value is ConfidenceScore {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= CONFIDENCE_MIN &&
    value <= CONFIDENCE_MAX
  );
}

/**
 * Checks the onboarding answers. Returns an empty list when everything is valid.
 * Messages are for developers and logs, not for display; screens should map
 * `field` to their own translated text.
 */
export function validateOnboarding(state: OnboardingState): OnboardingError[] {
  const errors: OnboardingError[] = [];
  const country = state.country ? getCountry(state.country) : undefined;

  if (!country) {
    errors.push({ field: 'country', message: `Unsupported or missing country: ${state.country}` });
  } else if (!state.language || !country.supportedLanguages.includes(state.language)) {
    errors.push({
      field: 'language',
      message: `Language ${state.language} is not supported for ${country.countryCode}`,
    });
  }
  if (!isOneOf(LIFE_STAGES, state.lifeStage)) {
    errors.push({ field: 'lifeStage', message: 'Life stage is required' });
  }
  if (!isOneOf(GOALS, state.goal)) {
    errors.push({ field: 'goal', message: 'Goal is required' });
  }
  if (!isOneOf(COMFORT_LEVELS, state.comfort)) {
    errors.push({ field: 'comfort', message: 'Comfort level is required' });
  }
  for (const topic of TOPICS) {
    if (!isConfidenceScore(state.confidence[topic])) {
      errors.push({
        field: `confidence.${topic}`,
        message: `Confidence for ${topic} must be an integer from ${CONFIDENCE_MIN} to ${CONFIDENCE_MAX}`,
      });
    }
  }
  return errors;
}

/**
 * Validates the onboarding state and converts it to the plain JSON object sent
 * to the onboarding API. All API-specific naming lives here, so when the
 * /v1/onboarding request body is agreed only this function changes.
 * Confidence is sent as the raw 1–5 value (see docs/onboarding-contract.md).
 */
export function buildOnboardingPayload(state: OnboardingState): OnboardingResult {
  const errors = validateOnboarding(state);
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  // validateOnboarding has checked every field below, so the casts are safe.
  return {
    ok: true,
    payload: {
      country: state.country as OnboardingPayload['country'],
      language: state.language as OnboardingPayload['language'],
      accessibility: {
        read_aloud: state.accessibility.readAloud,
        simple_mode: state.accessibility.simpleMode,
        large_text: state.accessibility.largerText,
      },
      life_stage: state.lifeStage as OnboardingPayload['life_stage'],
      goal: state.goal as OnboardingPayload['goal'],
      comfort: state.comfort as OnboardingPayload['comfort'],
      confidence: {
        accounts: state.confidence.accounts as ConfidenceScore,
        saving: state.confidence.saving as ConfidenceScore,
        borrowing: state.confidence.borrowing as ConfidenceScore,
        scams: state.confidence.scams as ConfidenceScore,
        budget: state.confidence.budget as ConfidenceScore,
      },
    },
  };
}

/**
 * Maps a 1–5 slider value to the contract's 0–1 confidence scale
 * (1 → 0, 3 → 0.5, 5 → 1). Not applied to the outgoing payload until the
 * /v1/onboarding request format is confirmed with Will.
 */
export function normalizeConfidence(score: ConfidenceScore): number {
  return (score - CONFIDENCE_MIN) / (CONFIDENCE_MAX - CONFIDENCE_MIN);
}

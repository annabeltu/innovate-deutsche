// Creates the learner on the server from the app's onboarding answers, so the
// lesson APIs (which need a user_id) can personalize for them.
import { apiRequest } from "./client";
import { useApp } from "../state/useApp";
import type {
  Comfort,
  Country,
  Goal,
  Language,
  LifeStage,
  OnboardingRequest,
  OnboardingResponse,
  QuizSkipResponse,
  Topic,
} from "../types/api";

/** The onboarding answers the app stores, as written by the onboarding screens. */
export type OnboardingAnswers = {
  country: Country;
  language: string;
  stage: string;
  goal: string;
  comfort: number;
  confidence: number[];
  readAloud: boolean;
  simple: boolean;
  large: boolean;
};

const LIFE_STAGES: Record<string, LifeStage> = {
  Student: "student",
  "First job": "first_job",
  Parent: "parent",
  Retired: "retired",
};
const GOALS: Record<string, Goal> = {
  "Save more": "save_more",
  "Avoid debt": "avoid_debt",
  "Stay safe online": "stay_safe_online",
  "Handle emergencies": "handle_emergencies",
};
// Order of the sliders on the confidence screen.
const CONFIDENCE_TOPICS: Topic[] = [
  "accounts",
  "saving",
  "borrowing",
  "scams",
  "budget",
];
// Languages the API offers per country; the first is the default.
const LANGUAGES_BY_COUNTRY: Record<Country, Language[]> = {
  US: ["en", "es"],
  MX: ["es", "en"],
  KE: ["en", "sw"],
};
const DEFAULT_CONFIDENCE = 0.5;
const COMFORT_STEP = 1 / 3;
// Onboarding does not ask where savings are kept; lessons do not use it.
const DEFAULT_SAVINGS_HABIT = "none";

/** The lesson language: the app language if the country offers it, else the country default. */
export function lessonLanguage(
  country: Country,
  appLanguage: string,
): Language {
  const offered = LANGUAGES_BY_COUNTRY[country];
  return offered.find((code) => code === appLanguage) ?? offered[0];
}

/** Map the 0-1 comfort slider onto the API's 1-3 comfort levels. */
export function comfortLevel(slider: number): Comfort {
  if (slider < COMFORT_STEP) return 1;
  return slider < 2 * COMFORT_STEP ? 2 : 3;
}

/** Translate the app's onboarding answers into the API's onboarding request. */
export function toOnboardingRequest(
  answers: OnboardingAnswers,
): OnboardingRequest {
  return {
    country: answers.country,
    language: lessonLanguage(answers.country, answers.language),
    accessibility: {
      read_aloud: answers.readAloud,
      simple_mode: answers.simple,
      large_text: answers.large,
    },
    life_stage: LIFE_STAGES[answers.stage] ?? "first_job",
    goal: GOALS[answers.goal] ?? "save_more",
    comfort: comfortLevel(answers.comfort),
    savings_habit: DEFAULT_SAVINGS_HABIT,
    confidence: Object.fromEntries(
      CONFIDENCE_TOPICS.map((topic, i) => [
        topic,
        answers.confidence[i] ?? DEFAULT_CONFIDENCE,
      ]),
    ) as Record<Topic, number>,
  };
}

let pendingLearner: Promise<string> | null = null;

/**
 * Return the server user_id for the current answers, creating the learner
 * if there is none or the answers changed since it was created. The app has
 * no baseline quiz, so it is skipped and proficiency equals confidence.
 */
export function ensureLearner(): Promise<string> {
  const state = useApp.getState();
  const request = toOnboardingRequest(state);
  const key = JSON.stringify(request);
  if (state.learnerId && state.learnerKey === key) {
    return Promise.resolve(state.learnerId);
  }
  pendingLearner ??= createLearner(request, key).finally(() => {
    pendingLearner = null;
  });
  return pendingLearner;
}

async function createLearner(
  request: OnboardingRequest,
  key: string,
): Promise<string> {
  const started = await apiRequest<OnboardingResponse>("/v1/onboarding", {
    method: "POST",
    body: request,
  });
  await apiRequest<QuizSkipResponse>(`/v1/quiz/${started.quiz.quiz_id}/skip`, {
    method: "POST",
    body: { user_id: started.user_id },
  });
  useApp.getState().set({ learnerId: started.user_id, learnerKey: key });
  return started.user_id;
}

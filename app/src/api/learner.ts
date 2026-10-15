import { COUNTRIES } from "../onboarding/countries";
import { TOPICS } from "../types/onboarding";
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
  LearnerProfile,
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
  student: "student",
  first_job: "first_job",
  parent: "parent",
  retired: "retired",
  Student: "student",
  "First job": "first_job",
  Parent: "parent",
  Retired: "retired",
};
const GOALS: Record<string, Goal> = {
  save_more: "save_more",
  avoid_debt: "avoid_debt",
  stay_safe_online: "stay_safe_online",
  handle_emergencies: "handle_emergencies",
  "Save more": "save_more",
  "Avoid debt": "avoid_debt",
  "Stay safe online": "stay_safe_online",
  "Handle emergencies": "handle_emergencies",
};
// Order of the sliders on the confidence screen.
const CONFIDENCE_TOPICS: readonly Topic[] = TOPICS;
/** Country/language pairs from the shared onboarding configuration. */
export const LANGUAGES_BY_COUNTRY = Object.fromEntries(
  COUNTRIES.map((country) => [country.countryCode, country.supportedLanguages]),
) as Record<Country, Language[]>;
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
      voice_mode: answers.readAloud,
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
 * if there is none or core answers changed; language/accessibility changes
 * update the same profile. The app has
 * no baseline quiz, so it is skipped and proficiency equals confidence.
 */
export function ensureLearner(): Promise<string> {
  const state = useApp.getState();
  const request = toOnboardingRequest(state);
  const key = JSON.stringify(request);
  if (state.learnerId && state.learnerKey === key) {
    return Promise.resolve(state.learnerId);
  }
  if (pendingLearner) return pendingLearner.then(() => ensureLearner());
  pendingLearner = syncLearner(request, key).finally(() => {
    pendingLearner = null;
  });
  return pendingLearner;
}

function identityKey(request: OnboardingRequest): string {
  const { language, accessibility, ...answers } = request;
  return JSON.stringify(answers);
}

async function syncLearner(
  request: OnboardingRequest,
  key: string,
): Promise<string> {
  const state = useApp.getState();
  const previous = state.learnerKey
    ? (JSON.parse(state.learnerKey) as OnboardingRequest)
    : null;
  if (
    !state.learnerId ||
    !previous ||
    identityKey(previous) !== identityKey(request)
  ) {
    return createLearner(request, key);
  }
  const path = `/v1/profile/${encodeURIComponent(state.learnerId)}`;
  if (previous.language !== request.language) {
    await apiRequest<LearnerProfile>(`${path}/language`, {
      method: "PATCH",
      body: { language: request.language },
    });
  }
  if (
    JSON.stringify(previous.accessibility) !==
    JSON.stringify(request.accessibility)
  ) {
    await apiRequest<LearnerProfile>(`${path}/accessibility`, {
      method: "PATCH",
      body: request.accessibility,
    });
  }
  useApp.getState().set({ learnerKey: key });
  return state.learnerId;
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
  // Bonus lessons are stored per server learner, so the previous learner's
  // ids return 404 for the new one and must not stay on the roadmap.
  useApp.getState().set({
    learnerId: started.user_id,
    learnerKey: key,
    bonus: [],
    bonusLessonIds: {},
  });
  return started.user_id;
}

import type {
  AccessibilityPreferences,
  ComfortLevel,
  ConfidenceScore,
  Goal,
  LifeStage,
  Topic,
} from '@/src/types/onboarding';

// Onboarding answer options. Screens render these lists instead of
// hard-coding ids or text. Text lives in src/i18n/locales under the keys below.
// `icon` is an identifier for the UI to map to an asset; it is not an asset path.

export type OnboardingOption<Id extends string> = {
  id: Id;
  labelKey: string;
  helperKey: string;
  icon: string;
};

export type ConfidenceQuestion = {
  id: Topic;
  labelKey: string;
  questionKey: string;
  icon: string;
  min: ConfidenceScore;
  max: ConfidenceScore;
};

export const CONFIDENCE_MIN: ConfidenceScore = 1;
export const CONFIDENCE_MAX: ConfidenceScore = 5;

/** Spoken/visible labels for each slider value, e.g. 1 = "Very low". */
export const CONFIDENCE_SCALE_KEYS: Record<ConfidenceScore, string> = {
  1: 'onboarding.confidenceScale.1',
  2: 'onboarding.confidenceScale.2',
  3: 'onboarding.confidenceScale.3',
  4: 'onboarding.confidenceScale.4',
  5: 'onboarding.confidenceScale.5',
};

export const ACCESSIBILITY_OPTIONS: OnboardingOption<keyof AccessibilityPreferences>[] = [
  {
    id: 'readAloud',
    labelKey: 'onboarding.accessibility.readAloud.label',
    helperKey: 'onboarding.accessibility.readAloud.helper',
    icon: 'speaker',
  },
  {
    id: 'simpleMode',
    labelKey: 'onboarding.accessibility.simpleMode.label',
    helperKey: 'onboarding.accessibility.simpleMode.helper',
    icon: 'sparkle',
  },
  {
    id: 'largerText',
    labelKey: 'onboarding.accessibility.largerText.label',
    helperKey: 'onboarding.accessibility.largerText.helper',
    icon: 'text-size',
  },
];

export const LIFE_STAGE_OPTIONS: OnboardingOption<LifeStage>[] = [
  {
    id: 'student',
    labelKey: 'onboarding.lifeStage.student.label',
    helperKey: 'onboarding.lifeStage.student.helper',
    icon: 'backpack',
  },
  {
    id: 'first_job',
    labelKey: 'onboarding.lifeStage.first_job.label',
    helperKey: 'onboarding.lifeStage.first_job.helper',
    icon: 'briefcase',
  },
  {
    id: 'parent',
    labelKey: 'onboarding.lifeStage.parent.label',
    helperKey: 'onboarding.lifeStage.parent.helper',
    icon: 'family',
  },
  {
    id: 'retired',
    labelKey: 'onboarding.lifeStage.retired.label',
    helperKey: 'onboarding.lifeStage.retired.helper',
    icon: 'armchair',
  },
];

export const GOAL_OPTIONS: OnboardingOption<Goal>[] = [
  {
    id: 'save_more',
    labelKey: 'onboarding.goal.save_more.label',
    helperKey: 'onboarding.goal.save_more.helper',
    icon: 'piggy-bank',
  },
  {
    id: 'avoid_debt',
    labelKey: 'onboarding.goal.avoid_debt.label',
    helperKey: 'onboarding.goal.avoid_debt.helper',
    icon: 'credit-card',
  },
  {
    id: 'stay_safe_online',
    labelKey: 'onboarding.goal.stay_safe_online.label',
    helperKey: 'onboarding.goal.stay_safe_online.helper',
    icon: 'shield',
  },
  {
    id: 'handle_emergencies',
    labelKey: 'onboarding.goal.handle_emergencies.label',
    helperKey: 'onboarding.goal.handle_emergencies.helper',
    icon: 'umbrella',
  },
];

export const COMFORT_OPTIONS: OnboardingOption<ComfortLevel>[] = [
  {
    id: 'beginner',
    labelKey: 'onboarding.comfort.beginner.label',
    helperKey: 'onboarding.comfort.beginner.helper',
    icon: 'seedling',
  },
  {
    id: 'somewhat_comfortable',
    labelKey: 'onboarding.comfort.somewhat_comfortable.label',
    helperKey: 'onboarding.comfort.somewhat_comfortable.helper',
    icon: 'sprout',
  },
  {
    id: 'confident',
    labelKey: 'onboarding.comfort.confident.label',
    helperKey: 'onboarding.comfort.confident.helper',
    icon: 'tree',
  },
];

function confidenceQuestion(id: Topic, icon: string): ConfidenceQuestion {
  return {
    id,
    labelKey: `onboarding.confidence.${id}.label`,
    questionKey: `onboarding.confidence.${id}.question`,
    icon,
    min: CONFIDENCE_MIN,
    max: CONFIDENCE_MAX,
  };
}

/** The five confidence sliders, in the order they are asked. */
export const CONFIDENCE_QUESTIONS: ConfidenceQuestion[] = [
  confidenceQuestion('accounts', 'bank'),
  confidenceQuestion('saving', 'piggy-bank'),
  confidenceQuestion('borrowing', 'hand-coins'),
  confidenceQuestion('scams', 'shield-alert'),
  confidenceQuestion('budget', 'calculator'),
];

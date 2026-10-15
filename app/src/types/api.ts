// Must mirror api/app/schemas/shared.py

export type Country = 'IN' | 'KE' | 'DE';

export type Language = 'en' | 'hi' | 'sw' | 'de';

export type Topic = 'accounts' | 'saving' | 'borrowing' | 'scams' | 'budget';

export type LifeStage = 'student' | 'first_job' | 'parent' | 'retired';

export type Goal =
  | 'save_more'
  | 'avoid_debt'
  | 'stay_safe_online'
  | 'handle_emergencies';

export type SavingsHabit =
  | 'cash_at_home'
  | 'savings_group'
  | 'bank'
  | 'gold_or_assets'
  | 'none';

/** Accessibility settings that change how lessons are presented. */
export interface Accessibility {
  voice_mode: boolean;
  read_aloud: boolean;
  simple_mode: boolean;
  large_text: boolean;
  speech_rate: number;
}

/** How well the learner knows one topic; every value is 0 to 1. */
export interface TopicScore {
  confidence: number;
  quiz_score: number;
  proficiency: number;
  completed: boolean;
}

/** Everything known about a learner; the only handoff between the two APIs. */
export interface LearnerProfile {
  user_id: string;
  country: Country;
  language: Language;
  accessibility: Accessibility;
  life_stage: LifeStage;
  goal: Goal;
  comfort: number;
  savings_habit: SavingsHabit;
  topic_scores: Record<Topic, TopicScore>;
  bonus_lesson_ids: string[];
  /** ISO 8601 UTC timestamp. */
  updated_at: string;
}

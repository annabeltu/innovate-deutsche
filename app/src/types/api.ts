// Must mirror api/app/schemas/shared.py

/** The demo MVP focuses on KE, US and MX. */
export type Country = 'KE' | 'US' | 'MX' | 'IN' | 'DE';

/** The demo MVP focuses on en, es and sw. */
export type Language = 'en' | 'es' | 'sw' | 'hi' | 'de';

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

/** How far the learner's group trails the Findex benchmark on one topic. */
export interface TopicNeed {
  indicator: string;
  group_rate: number;
  benchmark_rate: number;
  findex_gap: number;
}

/** What a learner is likely to struggle with, from the Findex data. */
export interface LearnerNeeds {
  user_id: string;
  country: Country;
  topic_needs: Record<Topic, TopicNeed>;
}

export type CardType =
  | 'concept'
  | 'bridge'
  | 'mc_quiz'
  | 'drag_match'
  | 'compare_chart'
  | 'clause_tap'
  | 'scam_swipe'
  | 'budget_sim'
  | 'takeaway';

export type AnswerMode = 'say_option' | 'say_next';

/** Spoken version of a card, so every lesson works by voice alone. */
export interface VoiceBlock {
  speak_text: string;
  answer_mode: AnswerMode;
  spoken_options: Record<string, string>;
  correct_feedback: string | null;
  incorrect_feedback: string | null;
}

/** One screen of a lesson. */
export interface LessonCard {
  card_id: string;
  type: CardType;
  text: string;
  options: Record<string, string>;
  correct_option: string | null;
  voice: VoiceBlock;
}

/** A lesson customized for one learner. */
export interface Lesson {
  lesson_id: string;
  topic: Topic;
  title: string;
  goal: string;
  difficulty: 1 | 2 | 3;
  cards: LessonCard[];
}

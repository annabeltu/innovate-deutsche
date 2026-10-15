// Must mirror api/app/schemas/shared.py

export type Country = 'US' | 'MX' | 'KE';
export type Language = 'en' | 'es' | 'sw';
export type Topic = 'accounts' | 'saving' | 'borrowing' | 'scams' | 'budget';
export type LifeStage = 'student' | 'first_job' | 'parent' | 'retired';
export type Goal = 'save_more' | 'avoid_debt' | 'stay_safe_online' | 'handle_emergencies';
export type SavingsHabit = 'cash_at_home' | 'savings_group' | 'bank' | 'gold_or_assets' | 'none';
export type Comfort = 1 | 2 | 3;
export type Difficulty = 1 | 2 | 3;

export interface Accessibility {
  voice_mode: boolean;
  read_aloud: boolean;
  simple_mode: boolean;
  large_text: boolean;
  speech_rate: number;
}

export interface TopicScore {
  confidence: number;
  quiz_score: number | null;
  proficiency: number;
  completed: boolean;
}

export interface LearnerProfile {
  user_id: string;
  country: Country;
  language: Language;
  accessibility: Accessibility;
  life_stage: LifeStage;
  goal: Goal;
  comfort: Comfort;
  savings_habit: SavingsHabit;
  topic_scores: Record<Topic, TopicScore>;
  bonus_lesson_ids: string[];
  updated_at: string;
}

export interface OnboardingRequest {
  language: Language;
  country: Country;
  accessibility?: Partial<Accessibility>;
  life_stage: LifeStage;
  goal: Goal;
  comfort: Comfort;
  savings_habit: SavingsHabit;
  confidence: Record<Topic, number>;
}

export interface QuizOption {
  option_id: string;
  text: string;
}

export interface QuestionVoice {
  speak_text: string;
}

export interface QuizQuestion {
  question_id: string;
  topic: Topic;
  difficulty: Difficulty;
  prompt: string;
  options: QuizOption[];
  voice: QuestionVoice;
}

export interface Quiz {
  quiz_id: string;
  language: Language;
  questions: QuizQuestion[];
}

export interface OnboardingResponse {
  user_id: string;
  quiz: Quiz;
}

export interface QuizAnswer {
  question_id: string;
  option_id: string;
}

export interface QuizSubmitRequest {
  user_id: string;
  answers: QuizAnswer[];
}

export interface QuestionResult {
  question_id: string;
  correct: boolean;
  correct_option_id: string;
}

export interface QuizSubmitResponse {
  profile: LearnerProfile;
  results: QuestionResult[];
}

export interface QuizSkipRequest {
  user_id: string;
}

export interface QuizSkipResponse {
  profile: LearnerProfile;
}

export type AccessibilityUpdate = Partial<Accessibility>;

export interface LessonResultRequest {
  lesson_id: string;
  correct: number;
  total: number;
  completed: boolean;
}

export interface LessonResultResponse {
  topic: Topic | null;
  proficiency: number | null;
  completed: boolean;
  path_refresh_needed: boolean;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}

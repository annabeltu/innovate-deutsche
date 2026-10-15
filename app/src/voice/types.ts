// Voice API types. Must mirror api/app/schemas/voice.py.
// Kept out of src/types/api.ts until Faraz and Will approve adding them to the shared
// contract (see docs/VOICE_API.md).
import type { Language } from "@/src/types/api";

export type VoiceIntent =
  | "yes"
  | "no"
  | "repeat"
  | "next"
  | "back"
  | "help"
  | "start"
  | "option"
  | "number"
  | "scam"
  | "legitimate"
  | "unknown";

export type OptionId = "a" | "b" | "c" | "d";

export interface IntentRequest {
  text: string;
  language: Language;
}

export interface IntentResponse {
  intent: VoiceIntent;
  option_id: OptionId | null;
  number: number | null;
  confidence: number;
  normalized_text: string;
}

export interface TranscriptionResponse {
  text: string;
  language: Language;
  is_fixture: boolean;
}

export interface SpeakRequest {
  text: string;
  language: Language;
  rate: number;
}

// Provisional: the card `voice` block from docs/API_CONTRACTS.md. Replace with the
// type from src/types/api.ts once Faraz adds the lesson card models there. Only
// `say_option` is documented so far, so answer_mode stays a plain string.
export interface CardVoice {
  speak_text: string;
  answer_mode: string;
  spoken_options?: Partial<Record<OptionId, string>>;
  correct_feedback?: string;
  incorrect_feedback?: string;
}

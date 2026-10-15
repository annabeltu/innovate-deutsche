import type { IntentResponse, VoiceIntent } from '@/src/voice/types';

// One spoken Ask Kiko turn: listen → transcribe → command or question → ask → speak the
// answer → confirm → add the bonus lesson → announce. Every side effect is injected, so
// the same flow runs against the real API, the mock adapter, or test fakes. A bonus
// lesson is only ever added after the learner clearly says yes.

/** i18n keys under `voice` in src/voice/locales; every one exists in en, es and sw. */
export type AskKikoPromptKey =
  | 'voice.askKiko.prompt'
  | 'voice.askKiko.thinking'
  | 'voice.askKiko.nothingHeard'
  | 'voice.askKiko.confirmRetry'
  | 'voice.askKiko.confirmHelp'
  | 'voice.askKiko.adding'
  | 'voice.askKiko.declined'
  | 'voice.askKiko.notAdded'
  | 'voice.askKiko.error'
  | 'voice.askKiko.addFailed'
  | 'voice.microphoneDenied';

/** A bonus lesson Kiko offers; the learner must say yes before it is added. */
export interface LessonOffer {
  /** Spoken yes/no question in the learner's language. */
  confirmPrompt: string;
  /** Opaque value the adapter needs to add this exact offer (e.g. an offer id). */
  offerRef: string;
}

/** What the voice flow needs from POST /v1/ask, independent of its wire shape. */
export interface AskKikoReply {
  spokenAnswer: string;
  lessonOffer: LessonOffer | null;
}

/** The Ask Kiko backend as the voice flow sees it. See docs/VOICE_API.md for the contract. */
export interface AskKikoApi {
  ask: (question: string) => Promise<AskKikoReply>;
  /** Adds the offered lesson to the path and returns its spoken announcement. */
  addBonusLesson: (offerRef: string) => Promise<string>;
}

export interface AskKikoDeps extends AskKikoApi {
  /** Stop any speech, record until the learner stops, transcribe; '' if silent. */
  listen: () => Promise<string>;
  recognizeIntent: (text: string) => Promise<IntentResponse>;
  speak: (text: string) => Promise<void>;
  speakPrompt: (key: AskKikoPromptKey) => Promise<void>;
}

export type AskKikoResult =
  | { outcome: 'lesson_added' | 'lesson_declined' | 'unconfirmed' | 'answered' | 'not_heard' }
  /** The learner said back, help or repeat; the screen handles it. */
  | { outcome: 'command'; command: IntentResponse }
  | { outcome: 'failed'; error: unknown };

export class MicrophonePermissionError extends Error {
  constructor() {
    super('Microphone permission was denied');
    this.name = 'MicrophonePermissionError';
  }
}

// Bounds the confirmation loop. There is no timer; this only stops endless re-asking.
export const MAX_CONFIRM_ATTEMPTS = 3;

// On the Ask screen only these are commands. Anything else, even "is it a scam?",
// is a question for Kiko.
const ASK_SCREEN_COMMANDS: readonly VoiceIntent[] = ['back', 'help', 'repeat'];

/** Run one Ask Kiko turn by voice and report how it ended. Errors are spoken, then returned. */
export async function runAskKikoTurn(deps: AskKikoDeps): Promise<AskKikoResult> {
  try {
    await deps.speakPrompt('voice.askKiko.prompt');
    const question = await deps.listen();
    if (!question.trim()) {
      await deps.speakPrompt('voice.askKiko.nothingHeard');
      return { outcome: 'not_heard' };
    }

    const command = await deps.recognizeIntent(question);
    if (ASK_SCREEN_COMMANDS.includes(command.intent)) {
      return { outcome: 'command', command };
    }

    await deps.speakPrompt('voice.askKiko.thinking');
    const reply = await deps.ask(question);
    await deps.speak(reply.spokenAnswer);
    if (!reply.lessonOffer) {
      return { outcome: 'answered' };
    }
    return await confirmBonusLesson(deps, reply.lessonOffer);
  } catch (error) {
    await speakFailure(deps, error);
    return { outcome: 'failed', error };
  }
}

async function confirmBonusLesson(deps: AskKikoDeps, offer: LessonOffer): Promise<AskKikoResult> {
  await deps.speak(offer.confirmPrompt);
  for (let attempt = 1; attempt <= MAX_CONFIRM_ATTEMPTS; attempt++) {
    const reply = await deps.recognizeIntent(await deps.listen());
    if (reply.intent === 'yes') {
      return addLesson(deps, offer.offerRef);
    }
    if (reply.intent === 'no') {
      await deps.speakPrompt('voice.askKiko.declined');
      return { outcome: 'lesson_declined' };
    }
    if (attempt === MAX_CONFIRM_ATTEMPTS) {
      break;
    }
    if (reply.intent === 'repeat') {
      await deps.speak(offer.confirmPrompt);
    } else if (reply.intent === 'help') {
      await deps.speakPrompt('voice.askKiko.confirmHelp');
    } else {
      await deps.speakPrompt('voice.askKiko.confirmRetry');
    }
  }
  await deps.speakPrompt('voice.askKiko.notAdded');
  return { outcome: 'unconfirmed' };
}

async function addLesson(deps: AskKikoDeps, offerRef: string): Promise<AskKikoResult> {
  try {
    await deps.speakPrompt('voice.askKiko.adding');
    await deps.speak(await deps.addBonusLesson(offerRef));
    return { outcome: 'lesson_added' };
  } catch (error) {
    await deps.speakPrompt('voice.askKiko.addFailed');
    return { outcome: 'failed', error };
  }
}

async function speakFailure(deps: AskKikoDeps, error: unknown): Promise<void> {
  const key =
    error instanceof MicrophonePermissionError ? 'voice.microphoneDenied' : 'voice.askKiko.error';
  await deps.speakPrompt(key);
}

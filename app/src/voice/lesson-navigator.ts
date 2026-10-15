import type { CardVoice, IntentResponse, OptionId, VoiceIntent } from '@/src/voice/types';

// Plays a lesson by voice alone from the cards' existing `voice` blocks. Pure: it takes
// the current state and what the learner said, and returns the next state plus effects
// for the screen to run (speak, grade an answer). No timers, so there are no time limits.

/** i18n keys under `voice.lesson` in src/voice/locales; every one exists in en, es and sw. */
export type LessonPromptKey =
  | 'voice.lesson.intro'
  | 'voice.lesson.help'
  | 'voice.lesson.notUnderstood'
  | 'voice.lesson.atFirstCard'
  | 'voice.lesson.complete'
  | 'voice.lesson.optionNotAvailable'
  | 'voice.lesson.sayNext'
  | 'voice.lesson.correct'
  | 'voice.lesson.incorrect';

export type VoiceEffect =
  /** Speak text that came from lesson data (already in the learner's language). */
  | { type: 'speak'; text: string }
  /** Speak a translated prompt: the screen calls t(key, values). */
  | { type: 'speak_prompt'; key: LessonPromptKey; values?: Record<string, string | number> }
  /** The learner answered the current card; the screen grades it and calls `answerGraded`. */
  | {
      type: 'answer';
      cardIndex: number;
      intent: VoiceIntent;
      optionId: OptionId | null;
      number: number | null;
    }
  /** The learner moved past the last card. */
  | { type: 'finished' };

export interface LessonVoiceState {
  status: 'not_started' | 'in_progress' | 'finished';
  cardIndex: number;
}

export interface LessonStep {
  state: LessonVoiceState;
  effects: VoiceEffect[];
}

const ANSWER_INTENTS: readonly VoiceIntent[] = [
  'option',
  'number',
  'yes',
  'no',
  'scam',
  'legitimate',
];

/** The state before the lesson is introduced. */
export function createLessonVoiceState(): LessonVoiceState {
  return { status: 'not_started', cardIndex: 0 };
}

/** Introduce the lesson and read the first card. */
export function startLesson(cards: readonly CardVoice[]): LessonStep {
  return {
    state: { status: 'in_progress', cardIndex: 0 },
    effects: [
      { type: 'speak_prompt', key: 'voice.lesson.intro', values: { count: cards.length } },
      ...readCard(cards, 0),
    ],
  };
}

/** Apply one recognized intent and return what to say or do next. */
export function handleLessonIntent(
  state: LessonVoiceState,
  cards: readonly CardVoice[],
  result: IntentResponse,
): LessonStep {
  if (state.status === 'not_started') {
    return handleBeforeStart(state, cards, result.intent);
  }
  if (state.status === 'finished') {
    return handleAfterFinish(state, cards, result.intent);
  }
  return handleDuringLesson(state, cards, result);
}

/** Speak the card's own feedback after the screen graded an answer. */
export function answerGraded(
  state: LessonVoiceState,
  cards: readonly CardVoice[],
  correct: boolean,
): LessonStep {
  const card = cards[state.cardIndex];
  const feedback = correct ? card?.correct_feedback : card?.incorrect_feedback;
  const effects: VoiceEffect[] = feedback
    ? [{ type: 'speak', text: feedback }]
    : [{ type: 'speak_prompt', key: correct ? 'voice.lesson.correct' : 'voice.lesson.incorrect' }];
  effects.push({ type: 'speak_prompt', key: 'voice.lesson.sayNext' });
  return { state, effects };
}

function handleBeforeStart(
  state: LessonVoiceState,
  cards: readonly CardVoice[],
  intent: VoiceIntent,
): LessonStep {
  if (intent === 'start' || intent === 'yes' || intent === 'next') {
    return startLesson(cards);
  }
  if (intent === 'help') {
    return say(state, 'voice.lesson.help');
  }
  return say(state, 'voice.lesson.notUnderstood');
}

function handleAfterFinish(
  state: LessonVoiceState,
  cards: readonly CardVoice[],
  intent: VoiceIntent,
): LessonStep {
  if (intent === 'back') {
    return goTo(cards, cards.length - 1);
  }
  return say(state, 'voice.lesson.complete');
}

function handleDuringLesson(
  state: LessonVoiceState,
  cards: readonly CardVoice[],
  result: IntentResponse,
): LessonStep {
  const { intent } = result;
  if (intent === 'repeat' || intent === 'start') {
    return { state, effects: readCard(cards, state.cardIndex) };
  }
  if (intent === 'next') {
    return goForward(state, cards);
  }
  if (intent === 'back') {
    return goBack(state, cards);
  }
  if (intent === 'help') {
    return say(state, 'voice.lesson.help');
  }
  if (ANSWER_INTENTS.includes(intent)) {
    return answer(state, cards, result);
  }
  return say(state, 'voice.lesson.notUnderstood');
}

function goForward(state: LessonVoiceState, cards: readonly CardVoice[]): LessonStep {
  if (state.cardIndex >= cards.length - 1) {
    return {
      state: { status: 'finished', cardIndex: state.cardIndex },
      effects: [{ type: 'speak_prompt', key: 'voice.lesson.complete' }, { type: 'finished' }],
    };
  }
  return goTo(cards, state.cardIndex + 1);
}

function goBack(state: LessonVoiceState, cards: readonly CardVoice[]): LessonStep {
  if (state.cardIndex === 0) {
    return {
      state,
      effects: [{ type: 'speak_prompt', key: 'voice.lesson.atFirstCard' }, ...readCard(cards, 0)],
    };
  }
  return goTo(cards, state.cardIndex - 1);
}

function answer(
  state: LessonVoiceState,
  cards: readonly CardVoice[],
  result: IntentResponse,
): LessonStep {
  const spokenOptions = cards[state.cardIndex]?.spoken_options;
  const letters = spokenOptions ? (Object.keys(spokenOptions) as OptionId[]) : [];
  const optionId = result.option_id;
  const offered = optionId !== null && letters.includes(optionId);
  if (result.intent === 'option' && letters.length > 0 && !offered) {
    return say(state, 'voice.lesson.optionNotAvailable', {
      letters: letters.map((letter) => letter.toUpperCase()).join(', '),
    });
  }
  return {
    state,
    effects: [
      {
        type: 'answer',
        cardIndex: state.cardIndex,
        intent: result.intent,
        optionId: result.option_id,
        number: result.number,
      },
    ],
  };
}

function goTo(cards: readonly CardVoice[], cardIndex: number): LessonStep {
  return { state: { status: 'in_progress', cardIndex }, effects: readCard(cards, cardIndex) };
}

function readCard(cards: readonly CardVoice[], cardIndex: number): VoiceEffect[] {
  const card = cards[cardIndex];
  return card ? [{ type: 'speak', text: card.speak_text }] : [];
}

function say(
  state: LessonVoiceState,
  key: LessonPromptKey,
  values?: Record<string, string | number>,
): LessonStep {
  return { state, effects: [{ type: 'speak_prompt', key, values }] };
}

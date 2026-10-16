import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import * as Speech from "expo-speech";
import { useTranslation } from "react-i18next";
import { recognizeIntent } from "../../api/voice";
import { lessonLanguage } from "../../api/learner";
import { useApp } from "../../state/useApp";
import type { LessonCard } from "../../types/api";
import { layout, spacing } from "../../theme/tokens";
import {
  ActionBar,
  Button,
  Card,
  Kiko,
  Label,
  Screen,
  Txt,
  useReduceMotion,
} from "../ui";
import type { KikoMood } from "../ui";
import { VoiceMicButton } from "../VoiceInput";
import { AnswerState, ChoiceCard, ScamCard } from "./AnswerCards";
import { BridgeCard } from "./BridgeCard";
import { ConceptCard, TakeawayCard } from "./TextCards";
import { LessonTopBar } from "./LessonTopBar";
import { cardSections } from "../../lessons/lesson-text";

const KIKO_SIZE = 64;
const NOT_ANSWERED: AnswerState = {
  answer: null,
  checked: false,
  wrongTries: 0,
};

/** Whether the card's own interaction is finished, so the learner may move on. */
function interactionDone(
  card: LessonCard,
  answer: AnswerState,
  revealed: boolean,
  flipped: [boolean, boolean],
): boolean {
  switch (card.type) {
    case "mc_quiz":
    case "scam_swipe":
      return answer.checked && answer.answer === card.correct_option;
    case "concept":
      return revealed || cardSections(card.text).rows.length === 0;
    case "bridge":
      return flipped[0] && flipped[1];
    default:
      return true;
  }
}

/**
 * One lesson card, language-app style: close, progress and hearts on top,
 * the card centred with a small Kiko, and the action pinned at the bottom
 * beside a round mic. Voice commands and read-aloud work as before; in
 * read-aloud mode every card starts fully revealed.
 */
export function LessonCardView({
  title,
  card,
  progress,
  isLast,
  rewardCoins,
  onNext,
  saving,
  saveFailed,
  onWrong,
  onBack,
}: {
  title: string;
  card: LessonCard;
  progress: number;
  isLast: boolean;
  rewardCoins: number;
  onNext: () => void;
  saving: boolean;
  saveFailed: boolean;
  onWrong: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const language = useApp((state) => state.language);
  const readAloud = useApp((state) => state.readAloud);
  const simple = useApp((state) => state.simple);
  const still = useReduceMotion() || simple;
  const [answer, setAnswer] = useState<AnswerState>(NOT_ANSWERED);
  // Derived from the live setting, not copied at mount: saved settings load
  // after the first render, and read-aloud users must never need to tap.
  const [tappedReveal, setRevealed] = useState(false);
  const revealed = tappedReveal || readAloud;
  const [tappedSides, setFlipped] = useState<[boolean, boolean]>([
    false,
    false,
  ]);
  const flipped: [boolean, boolean] = [
    tappedSides[0] || readAloud,
    tappedSides[1] || readAloud,
  ];
  const [voiceMessage, setVoiceMessage] = useState("");
  useSpokenCard(card);

  const isQuiz = card.correct_option !== null;
  const isCorrect = answer.answer === card.correct_option;
  const done = interactionDone(card, answer, revealed, flipped);
  // Spoken "next" moves on from any card a quiz doesn't block.
  const canContinueByVoice = !isQuiz || (answer.checked && isCorrect);
  const feedback = isCorrect
    ? card.voice.correct_feedback
    : card.voice.incorrect_feedback;
  const kikoMood: KikoMood = !answer.checked
    ? "happy"
    : isCorrect
      ? "cheer"
      : "oops";

  function check(letter: string | null) {
    if (letter === null) return;
    const correct = letter === card.correct_option;
    setAnswer((previous) => ({
      answer: letter,
      checked: true,
      wrongTries: previous.wrongTries + (correct ? 0 : 1),
    }));
    if (!correct) onWrong();
  }
  async function spokenReply(text: string) {
    const command = await recognizeIntent(text, language);
    if (useApp.getState().language !== language) return;
    if (command.intent === "back") return onBack();
    if (command.intent === "next" && canContinueByVoice && !saving)
      return onNext();
    if (
      command.intent === "option" &&
      command.option_id &&
      command.option_id in card.options
    ) {
      check(command.option_id);
      Speech.speak(
        (command.option_id === card.correct_option
          ? card.voice.correct_feedback
          : card.voice.incorrect_feedback) ?? t("voice.lesson.sayNext"),
        { language },
      );
      return;
    }
    Speech.speak(
      command.intent === "help"
        ? t("voice.lesson.help")
        : card.voice.speak_text,
      { language },
    );
  }
  const showMessage = useCallback((key: string) => setVoiceMessage(key), []);

  const needsCheck = card.type === "mc_quiz" && !done;
  const primary = needsCheck ? (
    <Button
      compact
      title={t("check")}
      icon="check"
      disabled={answer.answer === null || answer.checked}
      onPress={() => check(answer.answer)}
    />
  ) : (
    <Button
      compact
      title={saving ? t("saving") : isLast ? t("finish") : t("next")}
      disabled={!done || saving}
      onPress={onNext}
    />
  );

  return (
    <Screen
      footer={
        <ActionBar>
          {voiceMessage !== "" && (
            <Txt accessibilityLiveRegion="polite" variant="small">
              {t(voiceMessage)}
            </Txt>
          )}
          {saveFailed && (
            <Txt accessibilityLiveRegion="polite" variant="small" tone="danger">
              {t("lessonError")}
            </Txt>
          )}
          <View style={{ flexDirection: "row", gap: layout.itemGap }}>
            <View style={{ flex: 1 }}>{primary}</View>
            <VoiceMicButton onText={spokenReply} onMessage={showMessage} />
          </View>
        </ActionBar>
      }
    >
      <LessonTopBar progress={progress} />
      <View style={{ flex: 1, justifyContent: "center", gap: layout.itemGap }}>
        <Card style={{ gap: layout.sectionGap, padding: spacing.xl }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Label>{title}</Label>
            </View>
            <Kiko
              size={KIKO_SIZE}
              mood={kikoMood}
              pulse={!answer.checked}
              bounce={answer.checked && isCorrect ? 1 : 0}
              decorative
            />
          </View>
          {card.type === "mc_quiz" ? (
            <ChoiceCard
              card={card}
              state={answer}
              still={still}
              onSelect={(letter) =>
                setAnswer((previous) => ({
                  ...previous,
                  answer: letter,
                  checked: false,
                }))
              }
            />
          ) : card.type === "scam_swipe" ? (
            <ScamCard
              card={card}
              state={answer}
              still={still}
              onAnswer={check}
            />
          ) : card.type === "bridge" ? (
            <BridgeCard
              card={card}
              flipped={flipped}
              still={still}
              onFlip={(side) =>
                setFlipped((previous) =>
                  side === 0 ? [true, previous[1]] : [previous[0], true],
                )
              }
            />
          ) : card.type === "takeaway" ? (
            <TakeawayCard card={card} rewardCoins={rewardCoins} still={still} />
          ) : (
            <ConceptCard
              card={card}
              revealed={revealed}
              onReveal={() => setRevealed(true)}
            />
          )}
        </Card>
        {isQuiz && answer.checked && feedback && (
          <Txt
            accessibilityLiveRegion="polite"
            weight="semibold"
            tone={isCorrect ? "positive" : "danger"}
            style={{ textAlign: "center" }}
          >
            {feedback}
          </Txt>
        )}
      </View>
    </Screen>
  );
}

/** In read-aloud mode, speak the card's voice text (it reads every option). */
function useSpokenCard(card: LessonCard) {
  const readAloud = useApp((state) => state.readAloud);
  const language = useApp((state) =>
    lessonLanguage(state.country, state.language),
  );
  useEffect(() => {
    if (!readAloud) return;
    void Speech.stop();
    Speech.speak(card.voice.speak_text, { language });
    return () => {
      void Speech.stop();
    };
  }, [card, readAloud, language]);
}

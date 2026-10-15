// A lesson from the API (customized for this learner), shown card by card
// with the shared UI pieces. Used by the Lesson screen when the API is set.
import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import * as Speech from "expo-speech";
import { useTranslation } from "react-i18next";
import { useLesson } from "../api/lessons";
import { lessonLanguage } from "../api/learner";
import { useApp } from "../state/useApp";
import type { LessonCard } from "../types/api";
import {
  Button,
  Card,
  Choice,
  Kiko,
  Label,
  Progress,
  Row,
  Screen,
  Txt,
  c,
} from "./ui";

/** Loads a customized lesson and steps through its cards. */
export function ApiLesson({
  routeId,
  lessonId,
}: {
  routeId: string;
  lessonId: string;
}) {
  const { t } = useTranslation();
  const lesson = useLesson(lessonId);
  const [index, setIndex] = useState(0);

  if (lesson.isPending) {
    return (
      <Screen>
        <Kiko size={140} />
        <Txt accessibilityLiveRegion="polite" style={{ textAlign: "center" }}>
          {t("lessonLoading")}
        </Txt>
      </Screen>
    );
  }
  if (lesson.isError) {
    return (
      <Screen>
        <Txt accessibilityLiveRegion="polite" style={{ color: c.error }}>
          {t("lessonError")}
        </Txt>
        <Button title={t("tryAgain")} onPress={() => void lesson.refetch()} />
        <Button
          secondary
          title={t("roadmap")}
          onPress={() => router.replace("/roadmap")}
        />
      </Screen>
    );
  }

  const cards = lesson.data.cards;
  const isLast = index === cards.length - 1;
  return (
    <LessonCardView
      key={cards[index].card_id}
      title={lesson.data.title}
      card={cards[index]}
      progress={(index + 1) / cards.length}
      isLast={isLast}
      onNext={() => (isLast ? finish(routeId) : setIndex(index + 1))}
    />
  );
}

function finish(routeId: string) {
  const state = useApp.getState();
  const rewarded = !state.completed.includes(routeId);
  state.complete(routeId);
  router.replace({
    pathname: "/success",
    params: { id: routeId, rewarded: String(rewarded) },
  });
}

/** One card: concept text to read, or a quiz to answer before moving on. */
function LessonCardView({
  title,
  card,
  progress,
  isLast,
  onNext,
}: {
  title: string;
  card: LessonCard;
  progress: number;
  isLast: boolean;
  onNext: () => void;
}) {
  const { t } = useTranslation();
  const hearts = useApp((s) => s.hearts);
  const [answer, setAnswer] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  useSpokenCard(card);

  const isQuiz = card.correct_option !== null;
  const isCorrect = answer === card.correct_option;
  const canContinue = !isQuiz || (checked && isCorrect);
  const feedback = isCorrect
    ? card.voice.correct_feedback
    : card.voice.incorrect_feedback;
  return (
    <Screen>
      <Row>
        <Choice title="‹" onPress={() => router.replace("/roadmap")} />
        <Progress value={progress} />
        <Txt>♥ {hearts}</Txt>
      </Row>
      <Label>{title.toUpperCase()}</Label>
      <Card>
        <Txt>{card.text}</Txt>
      </Card>
      {Object.entries(card.options).map(([letter, text]) => (
        <Choice
          key={letter}
          title={`${letter.toUpperCase()}. ${text}`}
          selected={answer === letter}
          onPress={() => {
            setAnswer(letter);
            setChecked(false);
          }}
        />
      ))}
      {isQuiz && checked && feedback && (
        <Card
          style={{ backgroundColor: isCorrect ? c.successSoft : c.errorSoft }}
        >
          <Txt
            accessibilityLiveRegion="polite"
            style={{ color: isCorrect ? c.success : c.error }}
          >
            {feedback}
          </Txt>
        </Card>
      )}
      {canContinue ? (
        <Button title={isLast ? t("finish") : t("next")} onPress={onNext} />
      ) : (
        <Button
          title={`${t("check")}  ✓`}
          disabled={answer === null}
          onPress={() => setChecked(true)}
        />
      )}
    </Screen>
  );
}

/** In read-aloud mode, speak the card's voice text (it reads every option). */
function useSpokenCard(card: LessonCard) {
  const readAloud = useApp((s) => s.readAloud);
  const language = useApp((s) => lessonLanguage(s.country, s.language));
  useEffect(() => {
    if (!readAloud) return;
    void Speech.stop();
    Speech.speak(card.voice.speak_text, { language });
    return () => {
      void Speech.stop();
    };
  }, [card, readAloud, language]);
}

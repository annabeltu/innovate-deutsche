import { ApiError } from "../api/client";
// A lesson from the API (customized for this learner), shown card by card
// with the shared UI pieces. Used by the Lesson screen when the API is set.
import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLesson, saveLessonResult } from "../api/lessons";
import { LESSON_REWARD_COINS, useApp } from "../state/useApp";
import { Button, Kiko, KikoNote, Screen, Txt } from "./ui";
import { LessonCardView } from "./lesson/LessonCardView";

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
  const language = useApp((state) => state.language);
  useEffect(() => {
    setIndex(0);
    setWrongCards([]);
  }, [language]);
  const [wrongCards, setWrongCards] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  if (lesson.isPending) {
    return (
      <Screen>
        <Kiko size={140} mood="thinking" />
        <Txt accessibilityLiveRegion="polite" style={{ textAlign: "center" }}>
          {t("lessonLoading")}
        </Txt>
      </Screen>
    );
  }
  if (lesson.isError) {
    return (
      <Screen>
        <KikoNote
          live
          mood="oops"
          tone="error"
          message={t(
            lesson.error instanceof ApiError &&
              lesson.error.code === "lesson_translation_failed"
              ? "app.noTranslation"
              : "lessonError",
          )}
        />
        <Button
          title={t("tryAgain")}
          icon="refresh-cw"
          onPress={() => void lesson.refetch()}
        />
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
  async function next() {
    if (!isLast) {
      setIndex(index + 1);
      return;
    }
    setSaving(true);
    setSaveFailed(false);
    try {
      const total = cards.filter((card) => card.correct_option !== null).length;
      await saveLessonResult({
        lesson_id: lessonId,
        correct: total - wrongCards.length,
        total,
        completed: true,
      });
      finish(routeId);
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  }
  return (
    <LessonCardView
      key={`${lesson.dataUpdatedAt}-${cards[index].card_id}`}
      title={lesson.data.title}
      card={cards[index]}
      progress={(index + 1) / cards.length}
      isLast={isLast}
      rewardCoins={
        useApp.getState().completed.includes(routeId) ? 0 : LESSON_REWARD_COINS
      }
      onNext={() => void next()}
      onBack={() =>
        index > 0 ? setIndex(index - 1) : router.replace("/roadmap")
      }
      saving={saving}
      saveFailed={saveFailed}
      onWrong={() =>
        setWrongCards((previous) =>
          previous.includes(cards[index].card_id)
            ? previous
            : [...previous, cards[index].card_id],
        )
      }
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

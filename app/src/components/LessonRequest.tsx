// "Turn this into a lesson" for Ask Kiko, backed by POST /v1/bonus-lessons.
import React, { useEffect } from "react";
import * as Speech from "expo-speech";
import { useApp } from "../state/useApp";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ApiError } from "../api/client";
import { useRequestLesson } from "../api/lessons";
import { Button, Card, Txt, c } from "./ui";

const OFF_TOPIC = "off_topic_request";

/** Turns the learner's question into a lesson: a new one, or a matching core lesson. */
export function LessonRequest({
  question,
  confirmedByVoice = false,
}: {
  question: string;
  confirmedByVoice?: boolean;
}) {
  const { t } = useTranslation();
  const request = useRequestLesson();
  const result = request.data;
  const { mutate } = request;
  const language = useApp((state) => state.language);
  const readAloud = useApp((state) => state.readAloud);
  useEffect(() => {
    if (confirmedByVoice && question.trim()) mutate(question.trim());
  }, [confirmedByVoice, question, mutate]);
  useEffect(() => {
    if (readAloud && result)
      Speech.speak(
        result.generated
          ? t("addedToRoadmap")
          : `${t("lessonMatched")} ${result.lesson.title}`,
        { language },
      );
  }, [result, readAloud, language, t]);
  const isOffTopic =
    request.error instanceof ApiError && request.error.code === OFF_TOPIC;

  // The Ask screen already offers its own roadmap button below this one.
  if (result?.generated) {
    return <Button title={t("addedToRoadmap")} disabled onPress={() => {}} />;
  }
  if (result?.matched_topic) {
    const topic = result.matched_topic;
    return (
      <Card>
        <Txt accessibilityLiveRegion="polite">
          {t("lessonMatched")} {result.lesson.title}
        </Txt>
        <Button
          title={t("openLesson")}
          onPress={() =>
            router.push({ pathname: "/lesson", params: { id: topic } })
          }
        />
      </Card>
    );
  }
  return (
    <>
      <Button
        title={request.isPending ? t("makingLesson") : t("turnIntoLesson")}
        disabled={request.isPending || !question.trim()}
        onPress={() => request.mutate(question.trim())}
      />
      {request.isError && (
        <Txt accessibilityLiveRegion="polite" style={{ color: c.error }}>
          {isOffTopic
            ? t("lessonOffTopic")
            : request.error instanceof ApiError &&
                request.error.code === "lesson_translation_failed"
              ? t("app.noTranslation")
              : t("lessonRequestError")}
        </Txt>
      )}
    </>
  );
}

// "Turn this into a lesson" for Ask Kiko, backed by POST /v1/bonus-lessons.
import React from "react";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ApiError } from "../api/client";
import { useRequestLesson } from "../api/lessons";
import { Button, Card, Txt, c } from "./ui";

const OFF_TOPIC = "off_topic_request";

/** Turns the learner's question into a lesson: a new one, or a matching core lesson. */
export function LessonRequest({ question }: { question: string }) {
  const { t } = useTranslation();
  const request = useRequestLesson();
  const result = request.data;
  const isOffTopic =
    request.error instanceof ApiError && request.error.code === OFF_TOPIC;

  if (result?.generated) {
    return (
      <>
        <Button title={t("addedToRoadmap")} disabled onPress={() => {}} />
        <Button
          secondary
          title={`${t("roadmap")} →`}
          onPress={() => router.replace("/roadmap")}
        />
      </>
    );
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
        <Txt accessibilityLiveRegion="polite" style={{ color: c.noticeOnDark }}>
          {isOffTopic ? t("lessonOffTopic") : t("lessonRequestError")}
        </Txt>
      )}
    </>
  );
}

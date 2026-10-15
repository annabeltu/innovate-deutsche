import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen, Progress } from "../components/ui";
import { AppScenery } from "../components/AppScenery";
import { AccountHeader } from "../components/AccountHeader";
import { Action } from "./Confidence";
import { useApp } from "../state/useApp";
import { useStartQuiz, useSubmitQuiz } from "../api/onboarding";
import { buildOnboardingRequest } from "../onboarding/request";
import type { OnboardingResponse, QuizAnswer } from "../types/api";

/** Restore the baseline quiz between confidence sliders and the path preview. */
export function QuizScreen() {
  const { t } = useTranslation();
  const country = useApp((state) => state.country);
  const language = useApp((state) => state.language);
  const confidence = useApp((state) => state.confidence);
  const start = useStartQuiz();
  const { mutate } = start;
  const started = useRef(false);
  const request = useMemo(() => {
    try {
      return buildOnboardingRequest({
        ...useApp.getState(),
        country,
        language,
        confidence,
      });
    } catch {
      return null;
    }
  }, [country, language, confidence]);
  useEffect(() => {
    if (request && !started.current) {
      started.current = true;
      mutate(request);
    }
  }, [request, mutate]);
  if (start.data) return <QuizQuestions session={start.data} />;
  return (
    <Screen compact background={<AppScenery />}>
      <AccountHeader />
      <View className="items-center gap-3 py-8">
        <Image
          source={require("../../assets/challenges/kiko-happy-transparent.png")}
          resizeMode="contain"
          accessible={false}
          className="h-36 w-36"
        />
        <Text
          accessibilityRole="header"
          className="text-center text-3xl font-bold text-ink"
        >
          {t("quizTitle")}
        </Text>
        <Text className="text-center text-base leading-6 text-brand">
          {t("quizIntro")}
        </Text>
      </View>
      {(!request || start.isError) && (
        <Text
          accessibilityRole="alert"
          className="rounded-2xl bg-white p-4 text-danger"
        >
          {t(!request ? "unsupportedLanguage" : "apiUnavailable")}
        </Text>
      )}
      {start.isPending ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-center font-bold text-brand"
        >
          {t("quizLoading")}
        </Text>
      ) : (
        <Action
          title={t("experience.retry")}
          hint={t("quizStartHint")}
          disabled={!request}
          onPress={() => {
            if (request) mutate(request);
          }}
        />
      )}
      <QuizBack onPress={() => router.back()} />
    </Screen>
  );
}

function QuizBack({
  onPress,
  disabled = false,
}: {
  onPress: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("quizBack")}
      accessibilityHint={t("quizBackHint")}
      disabled={disabled}
      onPress={onPress}
      className="min-h-11 items-center justify-center"
    >
      <Text className="font-bold text-brand">‹ {t("quizBack")}</Text>
    </Pressable>
  );
}

function QuizQuestions({ session }: { session: OnboardingResponse }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const submit = useSubmitQuiz(session.quiz.quiz_id);
  const question = session.quiz.questions[index];
  const selected = answers[question.question_id];
  const last = index === session.quiz.questions.length - 1;
  const finish = () => {
    const payload: QuizAnswer[] = session.quiz.questions.map((entry) => ({
      question_id: entry.question_id,
      option_id: answers[entry.question_id],
    }));
    submit.mutate(
      { user_id: session.user_id, answers: payload },
      { onSuccess: () => router.replace("/path") },
    );
  };
  return (
    <Screen
      compact
      background={<AppScenery />}
      footer={
        <View className="px-5 pb-3 pt-2">
          <Action
            title={t(
              submit.isPending
                ? "quizLoading"
                : last
                  ? "quizFinish"
                  : "continue",
            )}
            hint={t("quizNextHint")}
            disabled={!selected || submit.isPending}
            onPress={() => (last ? finish() : setIndex(index + 1))}
          />
          <QuizBack
            disabled={submit.isPending}
            onPress={() => (index > 0 ? setIndex(index - 1) : router.back())}
          />
        </View>
      }
    >
      <AccountHeader />
      <View className="flex-row items-center gap-3">
        <View className="h-2 flex-1">
          <Progress value={(index + 1) / session.quiz.questions.length} />
        </View>
        <Text className="rounded-xl bg-ice px-3 py-2 text-sm font-bold text-brand">
          {index + 1} / {session.quiz.questions.length}
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-2">
          <Text className="text-xs font-bold uppercase tracking-widest text-brand">
            {t("experience.knowledgeCheck")}
          </Text>
          <Text
            accessibilityRole="header"
            className="text-3xl font-bold text-ink"
          >
            {t(`confidenceTopics.${question.topic}`)}
          </Text>
          <Text className="text-sm text-brand">
            {t("quizCount", {
              number: index + 1,
              total: session.quiz.questions.length,
            })}
          </Text>
        </View>
        <Image
          source={require("../../assets/challenges/kiko-thoughtful-transparent.png")}
          resizeMode="contain"
          accessible={false}
          className="h-28 w-24"
        />
      </View>
      <View className="gap-4 rounded-3xl bg-white p-5">
        <Text
          accessibilityLabel={question.voice.speak_text}
          className="text-xl font-bold leading-7 text-ink"
        >
          {question.prompt}
        </Text>
        <Text className="text-sm text-brand">{t("experience.quizHint")}</Text>
      </View>
      <View className="gap-3">
        {question.options.map((option) => (
          <Pressable
            key={option.option_id}
            accessibilityRole="radio"
            accessibilityLabel={`${option.option_id.toUpperCase()}: ${option.text}`}
            accessibilityHint={t("quizOptionHint")}
            accessibilityState={{
              checked: selected === option.option_id,
              disabled: submit.isPending,
            }}
            disabled={submit.isPending}
            onPress={() =>
              setAnswers((previous) => ({
                ...previous,
                [question.question_id]: option.option_id,
              }))
            }
            className={`min-h-16 flex-row items-center gap-3 rounded-2xl border-2 p-4 ${selected === option.option_id ? "border-brand bg-ice" : "border-transparent bg-white"}`}
          >
            <Text
              className={`h-9 w-9 rounded-full pt-2 text-center font-bold ${selected === option.option_id ? "bg-brand text-white" : "bg-ice text-brand"}`}
            >
              {option.option_id.toUpperCase()}
            </Text>
            <Text className="flex-1 text-base leading-6 text-ink">
              {option.text}
            </Text>
            {selected === option.option_id && (
              <Text accessible={false} className="font-bold text-brand">
                ✓
              </Text>
            )}
          </Pressable>
        ))}
      </View>
      {submit.isError && (
        <Text
          accessibilityRole="alert"
          className="rounded-2xl bg-white p-4 text-danger"
        >
          {t("apiUnavailable")}
        </Text>
      )}
    </Screen>
  );
}

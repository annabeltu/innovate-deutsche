import React, { useEffect, useMemo, useRef, useState } from "react";
import { Txt } from "../components/Txt";
import { Image, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Speech from "expo-speech";
import { recognizeIntent } from "../api/voice";
import { VoiceInput } from "../components/VoiceInput";
import {
  ActionBar,
  Button,
  Label,
  OptionRow,
  Progress,
  Screen,
  TextButton,
} from "../components/ui";
import { AppScenery } from "../components/AppScenery";
import { AccountHeader } from "../components/AccountHeader";
import { useApp } from "../state/useApp";
import { useStartQuiz, useSubmitQuiz } from "../api/onboarding";
import { buildOnboardingRequest } from "../onboarding/request";
import type { OnboardingResponse, QuizAnswer } from "../types/api";

// Fixed sizes: className width/height on Image is not applied on web, which
// let Kiko render at full resolution and squeeze the question into one column.
const KIKO_INTRO_SIZE = { width: 144, height: 144 };
const KIKO_QUESTION_SIZE = { width: 96, height: 112 };

/** Restore the baseline quiz between confidence sliders and the path preview. */
export function QuizScreen() {
  const language = useApp((state) => state.language);
  return <QuizSession key={language} />;
}

function QuizSession() {
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
  if (start.data && start.data.quiz.language === language)
    return <QuizQuestions session={start.data} />;
  return (
    <Screen compact background={<AppScenery />}>
      <AccountHeader />
      <View className="items-center gap-3 py-8">
        <Image
          source={require("../../assets/challenges/kiko-happy-transparent.png")}
          resizeMode="contain"
          accessible={false}
          style={KIKO_INTRO_SIZE}
        />
        <Txt
          accessibilityRole="header"
          variant="title"
          weight="bold"
          className="text-center"
        >
          {t("quizTitle")}
        </Txt>
        <Txt tone="brand" className="text-center">
          {t("quizIntro")}
        </Txt>
      </View>
      {(!request || start.isError) && (
        <Txt
          accessibilityRole="alert"
          tone="danger"
          className="rounded-2xl bg-white p-4"
        >
          {t(!request ? "unsupportedLanguage" : "apiUnavailable")}
        </Txt>
      )}
      {start.isPending ? (
        <Txt
          accessibilityLiveRegion="polite"
          tone="brand"
          weight="bold"
          className="text-center"
        >
          {t("quizLoading")}
        </Txt>
      ) : (
        <Button
          title={t("experience.retry")}
          accessibilityHint={t("quizStartHint")}
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
    <TextButton
      title={`‹ ${t("quizBack")}`}
      accessibilityLabel={t("quizBack")}
      accessibilityHint={t("quizBackHint")}
      disabled={disabled}
      onPress={onPress}
    />
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
  const readAloud = useApp((state) => state.readAloud);
  useEffect(() => {
    if (readAloud)
      Speech.speak(question.voice.speak_text, {
        language: session.quiz.language,
      });
    return () => {
      void Speech.stop();
    };
  }, [question, readAloud, session.quiz.language]);
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
  // Spoken replies: an option letter, next, back, help or repeat.
  async function spokenReply(text: string) {
    const command = await recognizeIntent(text, session.quiz.language);
    if (useApp.getState().language !== session.quiz.language) return;
    if (
      command.intent === "option" &&
      command.option_id &&
      question.options.some((option) => option.option_id === command.option_id)
    ) {
      setAnswers((previous) => ({
        ...previous,
        [question.question_id]: command.option_id!,
      }));
    } else if (command.intent === "next" && selected && !submit.isPending) {
      if (last) finish();
      else setIndex(index + 1);
    } else if (command.intent === "back" && !submit.isPending) {
      if (index > 0) setIndex(index - 1);
      else router.back();
    } else
      Speech.speak(
        command.intent === "help"
          ? t("voice.lesson.help")
          : question.voice.speak_text,
        { language: session.quiz.language },
      );
  }
  return (
    <Screen
      compact
      background={<AppScenery />}
      footer={
        <ActionBar>
          <Button
            title={t(
              submit.isPending
                ? "quizLoading"
                : last
                  ? "quizFinish"
                  : "continue",
            )}
            accessibilityHint={t("quizNextHint")}
            disabled={!selected || submit.isPending}
            onPress={() => (last ? finish() : setIndex(index + 1))}
          />
          <QuizBack
            disabled={submit.isPending}
            onPress={() => (index > 0 ? setIndex(index - 1) : router.back())}
          />
        </ActionBar>
      }
    >
      <AccountHeader />
      <View className="flex-row items-center gap-3">
        <View className="h-2 flex-1">
          <Progress value={(index + 1) / session.quiz.questions.length} />
        </View>
        <Txt
          variant="small"
          tone="brand"
          weight="bold"
          className="rounded-xl bg-ice px-3 py-2"
        >
          {index + 1} / {session.quiz.questions.length}
        </Txt>
      </View>
      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-2">
          <Label>{t("experience.knowledgeCheck")}</Label>
          <Txt accessibilityRole="header" variant="heading" weight="bold">
            {t(`confidenceTopics.${question.topic}`)}
          </Txt>
          <Txt variant="small" tone="brand">
            {t("quizCount", {
              number: index + 1,
              total: session.quiz.questions.length,
            })}
          </Txt>
        </View>
        <Image
          testID="quiz-kiko"
          source={require("../../assets/challenges/kiko-thoughtful-transparent.png")}
          resizeMode="contain"
          accessible={false}
          style={KIKO_QUESTION_SIZE}
        />
      </View>
      <View className="gap-4 rounded-3xl bg-white p-5">
        <Txt
          accessibilityLabel={question.voice.speak_text}
          variant="heading"
          weight="bold"
        >
          {question.prompt}
        </Txt>
        <Txt variant="small" tone="brand">
          {t("experience.quizHint")}
        </Txt>
      </View>
      <View className="gap-3">
        {question.options.map((option) => (
          <OptionRow
            key={option.option_id}
            letter={option.option_id.toUpperCase()}
            title={option.text}
            accessibilityLabel={`${option.option_id.toUpperCase()}: ${option.text}`}
            accessibilityHint={t("quizOptionHint")}
            selected={selected === option.option_id}
            disabled={submit.isPending}
            onPress={() =>
              setAnswers((previous) => ({
                ...previous,
                [question.question_id]: option.option_id,
              }))
            }
          />
        ))}
      </View>
      <VoiceInput onText={spokenReply} />
      {submit.isError && (
        <Txt
          accessibilityRole="alert"
          tone="danger"
          className="rounded-2xl bg-white p-4"
        >
          {t("apiUnavailable")}
        </Txt>
      )}
    </Screen>
  );
}

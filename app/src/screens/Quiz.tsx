import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen, Txt, Progress } from "../components/ui";
import { Action } from "./Confidence";
import { useApp } from "../state/useApp";
import { useStartQuiz, useSubmitQuiz } from "../api/onboarding";
import { buildOnboardingRequest } from "../onboarding/request";
import type { OnboardingResponse, QuizAnswer } from "../types/api";

/** Load the server quiz with explicit errors and no hidden language fallback. */
export function QuizScreen() {
  const { t } = useTranslation();
  const start = useStartQuiz();
  let request: ReturnType<typeof buildOnboardingRequest> | undefined;
  let invalid = false;
  try {
    request = buildOnboardingRequest(useApp.getState());
  } catch {
    invalid = true;
  }
  if (start.data) return <QuizQuestions session={start.data} />;
  return (
    <Screen>
      <Txt accessibilityRole="header" className="text-3xl font-bold">
        {t("quizTitle")}
      </Txt>
      <Txt>{t("quizIntro")}</Txt>
      {(invalid || start.isError) && (
        <Txt accessibilityRole="alert">
          {t(invalid ? "unsupportedLanguage" : "apiUnavailable")}
        </Txt>
      )}
      <Action
        title={t(start.isPending ? "quizLoading" : "quizBegin")}
        hint={t("quizStartHint")}
        disabled={invalid || start.isPending}
        onPress={() => {
          if (request) start.mutate(request);
        }}
      />
      <Action
        title={t("quizBack")}
        hint={t("quizBackHint")}
        onPress={() => router.back()}
      />
    </Screen>
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
      {
        onSuccess: () => {
          useApp.getState().set({ onboarded: true });
          router.replace("/path");
        },
      },
    );
  };
  return (
    <Screen>
      <Txt accessibilityRole="header" className="text-2xl font-bold">
        {t("quizTitle")}
      </Txt>
      <View className="h-2">
        <Progress value={(index + 1) / session.quiz.questions.length} />
      </View>
      <Txt>
        {t("quizCount", {
          number: index + 1,
          total: session.quiz.questions.length,
        })}
      </Txt>
      <Txt
        accessibilityLabel={question.voice.speak_text}
        className="text-2xl font-bold"
      >
        {question.prompt}
      </Txt>
      {question.options.map((option) => (
        <Pressable
          key={option.option_id}
          accessibilityRole="radio"
          accessibilityLabel={`${option.option_id.toUpperCase()}: ${option.text}`}
          accessibilityHint={t("quizOptionHint")}
          accessibilityState={{ checked: selected === option.option_id }}
          onPress={() =>
            setAnswers((previous) => ({
              ...previous,
              [question.question_id]: option.option_id,
            }))
          }
          className={`min-h-16 rounded-2xl border-2 p-4 ${selected === option.option_id ? "border-brand bg-ice" : "border-transparent bg-white"}`}
        >
          <Txt>
            {option.option_id.toUpperCase()}. {option.text}
          </Txt>
        </Pressable>
      ))}
      {submit.isError && (
        <Txt accessibilityRole="alert">{t("apiUnavailable")}</Txt>
      )}
      <Action
        title={t(
          submit.isPending ? "quizLoading" : last ? "quizFinish" : "continue",
        )}
        hint={t("quizNextHint")}
        disabled={!selected || submit.isPending}
        onPress={() => (last ? finish() : setIndex(index + 1))}
      />
      <Action
        title={t("quizBack")}
        hint={t("quizBackHint")}
        disabled={submit.isPending}
        onPress={() => (index > 0 ? setIndex(index - 1) : router.back())}
      />
    </Screen>
  );
}

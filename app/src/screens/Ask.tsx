import React, { useEffect, useState } from "react";
import { Txt } from "../components/Txt";
import { Pressable, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, Nav, Screen } from "../components/ui";
import { AccountHeader } from "../components/AccountHeader";
import { AppScenery } from "../components/AppScenery";
import { KikoAvatar } from "../components/KikoAvatar";

import { useApp } from "../state/useApp";
import { colors } from "../theme/tokens";
import { TRANSFER_LESSON } from "../shop/catalog";
import { useKikoAnswer } from "../api/assistant";
import { useKikoRecorder } from "../voice/use-kiko-recorder";
import { LessonRequest } from "../components/LessonRequest";
import { isApiConfigured } from "../api/client";

/** Voice and text assistant with an honest sample conversation and bonus-lesson action. */
export default function Ask() {
  const { t } = useTranslation();
  const language = useApp((state) => state.language);
  const country = useApp((state) => state.country);
  const bonus = useApp((state) => state.bonus);
  const [question, setQuestion] = useState("");
  const answer = useKikoAnswer();
  const ask = (text: string, demo = !process.env.EXPO_PUBLIC_API_URL) => {
    if (!text.trim()) return;
    setQuestion(text);
    answer.mutate({ question: text, country, language, demo });
  };
  const voice = useKikoRecorder((text) => ask(text, false));
  const busy = answer.isPending || voice.busy;
  const added = bonus.includes(TRANSFER_LESSON);
  useEffect(
    () => () => {
      void Speech.stop();
    },
    [],
  );
  return (
    <Screen
      compact
      narrate={!voice.isRecording}
      dark
      background={<AppScenery dark />}
      footer={<Nav active="ask" />}
    >
      <AccountHeader dark />
      <View className="items-center gap-1">
        <Txt accessibilityRole="header" variant="title" light>
          {t("askScreen.title")}
        </Txt>
        <Txt light>{t("askScreen.subtitle")}</Txt>
      </View>
      <View className="flex-row gap-2">
        {(
          [
            ["message-circle", "questionBenefit"],
            ["book-open", "answerBenefit"],
            ["zap", "lessonBenefit"],
          ] as const
        ).map(([icon, key]) => (
          <View
            key={key}
            className="min-h-14 flex-1 flex-row items-center gap-2 rounded-2xl bg-brand/60 p-2"
          >
            <Feather name={icon} size={20} color={colors.white} />
            <Txt variant="caption" light className="flex-1">
              {t(`askScreen.${key}`)}
            </Txt>
          </View>
        ))}
      </View>
      <View className="items-center">
        <KikoAvatar size={125} />
        <View className="-mt-3 flex-row items-center gap-4">
          <Wave />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(
              voice.isRecording ? "askScreen.stop" : "askScreen.record",
            )}
            accessibilityHint={t("askScreen.recordHint")}
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() => void voice.record()}
            className="h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-brand"
          >
            <Feather
              name={voice.isRecording ? "square" : "mic"}
              size={42}
              color={colors.white}
            />
          </Pressable>
          <Wave />
        </View>
        <Txt
          accessibilityLiveRegion="polite"
          variant="small"
          light
          className="mt-2"
        >
          {t(
            voice.isRecording
              ? "askScreen.listening"
              : busy
                ? "askScreen.thinking"
                : "askScreen.ready",
          )}
        </Txt>
      </View>
      <View className="gap-3 rounded-3xl bg-brand/70 p-4">
        <TextInput
          accessibilityLabel={t("askScreen.input")}
          accessibilityHint={t("askScreen.inputHint")}
          placeholder={t("askScreen.exampleQuestion")}
          placeholderTextColor={colors.lightBlue}
          multiline
          editable={!busy && !voice.isRecording}
          value={question}
          onChangeText={(text) => {
            setQuestion(text);
            if (answer.data) answer.reset();
          }}
          className="min-h-20 text-base leading-6 text-white"
        />
        <Button
          title={t("askScreen.send")}
          accessibilityHint={t("askScreen.sendHint")}
          disabled={busy || voice.isRecording || !question.trim()}
          onPress={() => ask(question)}
        />
      </View>
      {/* Turn the learner's own question into a real lesson from the API. */}
      {isApiConfigured() && (
        <LessonRequest key={`${language}-${question}`} question={question} />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("askScreen.tryExample")}
        accessibilityHint={t("askScreen.exampleHint")}
        disabled={busy || voice.isRecording}
        onPress={() => ask(t("askScreen.exampleQuestion"), true)}
        className="min-h-11 items-center justify-center"
      >
        <Txt light weight="semibold" className="underline">
          {t("askScreen.tryExample")}
        </Txt>
      </Pressable>
      {(voice.error || answer.isError) && (
        <Txt
          accessibilityRole="alert"
          tone="danger"
          className="rounded-xl bg-white p-3"
        >
          {voice.error || t("askScreen.connectionError")}
        </Txt>
      )}
      {answer.data && (
        <>
          <View className="gap-3 rounded-3xl bg-white p-4">
            <View className="flex-row items-center justify-between">
              <KikoAvatar size={48} />
              <Txt
                variant="caption"
                tone="brand"
                weight="bold"
                className="flex-1 px-2"
              >
                {t(
                  answer.data.sample
                    ? "askScreen.sample"
                    : "askScreen.response",
                )}
              </Txt>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("askScreen.read")}
                accessibilityHint={t("askScreen.readHint")}
                onPress={() => {
                  void Speech.stop();
                  Speech.speak(answer.data?.answer ?? "", { language });
                }}
                className="min-h-11 min-w-11 items-center justify-center rounded-full bg-ice"
              >
                <Feather name="volume-2" size={22} color={colors.deepBlue} />
              </Pressable>
            </View>
            <Txt accessibilityLiveRegion="polite">{answer.data.answer}</Txt>
          </View>
          {answer.data.canAddLesson && (
            <Button
              title={t(added ? "askScreen.added" : "askScreen.turnIntoLesson")}
              accessibilityHint={t("askScreen.addHint")}
              disabled={added}
              onPress={() => useApp.getState().addBonus(TRANSFER_LESSON)}
            />
          )}
          {added && (
            <Button
              title={t("roadmap")}
              accessibilityHint={t("challenge.backHint")}
              onPress={() => router.replace("/roadmap")}
            />
          )}
          <View className="flex-row flex-wrap gap-2">
            {["fees", "time", "safety"].map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={t(`askScreen.${key}Question`)}
                accessibilityHint={t("askScreen.exampleHint")}
                disabled={busy || voice.isRecording}
                onPress={() => ask(t(`askScreen.${key}Question`), true)}
                className="min-h-11 flex-1 items-center justify-center rounded-full border border-white px-2 py-3"
              >
                <Txt variant="caption" light className="text-center">
                  {t(`askScreen.${key}Question`)}
                </Txt>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

function Wave() {
  return (
    <View accessible={false} className="flex-row items-center gap-1">
      {[12, 28, 46, 24, 12].map((height, index) => (
        <View
          key={index}
          className="w-1 rounded-full bg-ice"
          style={{ height }}
        />
      ))}
    </View>
  );
}

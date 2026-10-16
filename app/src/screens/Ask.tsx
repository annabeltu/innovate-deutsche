import React, { useEffect, useState } from "react";
import { Txt } from "../components/Txt";
import { Pressable, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { useTranslation } from "react-i18next";
import { Nav, Screen } from "../components/ui";
import { AccountHeader } from "../components/AccountHeader";
import { AppScenery } from "../components/AppScenery";
import { KikoAvatar } from "../components/KikoAvatar";

import { useApp } from "../state/useApp";
import { colors, spacing } from "../theme/tokens";
import { useKikoRecorder } from "../voice/use-kiko-recorder";
import { LessonRequest } from "../components/LessonRequest";
import { BenefitBubbles } from "../components/BenefitBubbles";

/** Ask Kiko: type or say a money question and turn it into a lesson on the roadmap. */
export default function Ask() {
  const { t } = useTranslation();
  const language = useApp((state) => state.language);
  const [question, setQuestion] = useState("");
  // A spoken question fills the box; the learner then turns it into a lesson.
  const voice = useKikoRecorder((text) => {
    if (text.trim()) setQuestion(text);
  });
  const busy = voice.busy;
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
      <BenefitBubbles />
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
      {/* Extra room between the mic prompt and the question box. */}
      <View
        className="gap-3 rounded-3xl bg-brand/70 p-4"
        style={{ marginTop: spacing.lg }}
      >
        <TextInput
          accessibilityLabel={t("askScreen.input")}
          accessibilityHint={t("askScreen.inputHint")}
          placeholder={t("askScreen.exampleQuestion")}
          placeholderTextColor={colors.lightBlue}
          multiline
          editable={!busy && !voice.isRecording}
          value={question}
          onChangeText={setQuestion}
          className="min-h-20 text-base leading-6 text-white"
        />
        <LessonRequest key={`${language}-${question}`} question={question} />
      </View>
      {voice.error && (
        <Txt
          accessibilityRole="alert"
          tone="danger"
          className="rounded-xl bg-white p-3"
        >
          {voice.error}
        </Txt>
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

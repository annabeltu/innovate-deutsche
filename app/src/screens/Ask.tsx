import React, { useState } from "react";
import { TextInput } from "react-native";
import { router } from "expo-router";
import * as Speech from "expo-speech";
import { useTranslation } from "react-i18next";
import { LessonRequest } from "../components/LessonRequest";
import { VoiceInput } from "../components/VoiceInput";
import { recognizeIntent } from "../api/voice";
import { useApp } from "../state/useApp";
import { Screen, Txt, Title, Button, Kiko } from "../components/ui";

/** Ask for a real lesson by typing or recording, with no local sample answers. */
export default function Ask() {
  const [question, setQuestion] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const language = useApp((state) => state.language);
  const { t } = useTranslation();
  async function spokenQuestion(text: string) {
    const command = await recognizeIntent(text, language);
    if (useApp.getState().language !== language) return;
    if (command.intent === "back") {
      router.replace("/roadmap");
      return;
    }
    if (command.intent === "help" || command.intent === "repeat") {
      Speech.speak(t("voice.askKiko.prompt"), { language });
      return;
    }
    if (command.intent === "yes" && question) {
      setConfirmed(true);
      return;
    }
    if (command.intent === "no" && question) {
      setQuestion("");
      setConfirmed(false);
      return;
    }
    if (command.intent === "next" && confirmed) {
      router.replace("/roadmap");
      return;
    }
    setConfirmed(false);
    setQuestion(text);
    Speech.speak(t("confirmLesson"), { language });
  }
  return (
    <Screen>
      <Title>{t("ask")}</Title>
      <Kiko size={140} pulse />
      <Txt style={{ textAlign: "center" }}>{t("voice.askKiko.prompt")}</Txt>
      <VoiceInput onText={spokenQuestion} />
      <TextInput
        accessibilityLabel={t("voice.askKiko.prompt")}
        accessibilityHint={t("questionHint")}
        placeholder={t("questionPlaceholder")}
        value={question}
        onChangeText={(text) => {
          setConfirmed(false);
          setQuestion(text);
        }}
        multiline
        className="min-h-28 rounded-2xl bg-white p-5 text-lg text-ink"
      />
      <LessonRequest
        key={`${language}-${question}`}
        question={question}
        confirmedByVoice={confirmed}
      />
      <Button
        secondary
        title={t("roadmap")}
        onPress={() => router.replace("/roadmap")}
      />
    </Screen>
  );
}

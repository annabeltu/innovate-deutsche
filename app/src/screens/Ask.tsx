import React, { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { router } from "expo-router";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useTranslation } from "react-i18next";
import { useApp } from "../state/useApp";
import { askKiko } from "../api/ask";
import { VoiceApiError, apiBaseUrl, transcribeRecording } from "../api/voice";
import { speak, stopSpeaking } from "../voice/speech";
import {
  Screen,
  Txt,
  Label,
  Row,
  Button,
  Kiko,
  Card,
  c,
} from "../components/ui";

/** Error keys with their own message; anything else reads as "could not connect". */
const KNOWN_ERRORS = [
  "microphoneOff",
  "transcription",
  "audio_too_large",
  "rate_limited",
  "speech_unavailable",
];
/** Saved as a translation key so the roadmap shows it in the current language. */
const BONUS_TITLE = "journey.lessons.send";

export default function Ask() {
  const { t } = useTranslation();
  const language = useApp((s) => s.language);
  const country = useApp((s) => s.country);
  const readAloud = useApp((s) => s.readAloud);
  const addBonus = useApp((s) => s.addBonus);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recording = useAudioRecorderState(recorder);
  const demo = apiBaseUrl() === null;
  useEffect(() => stopSpeaking, []);

  function say(text: string) {
    if (readAloud) void speak(text, { language, country });
  }
  function fail(key: string) {
    const message = t(
      `voice.errors.${KNOWN_ERRORS.includes(key) ? key : "apiUnavailable"}`,
    );
    setError(message);
    say(message);
  }
  async function ask(text: string) {
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    setAdded(false);
    try {
      const reply =
        (await askKiko(text, country, language)) ?? t("voice.sampleAnswer");
      setAnswer(reply);
      say(reply);
    } catch (e) {
      fail(e instanceof VoiceApiError ? e.code : "apiUnavailable");
    } finally {
      setBusy(false);
    }
  }
  async function startRecording() {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) return fail("microphoneOff");
    stopSpeaking();
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  }
  async function finishRecording() {
    await recorder.stop();
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    });
    if (!recorder.uri) return fail("transcription");
    setBusy(true);
    try {
      const text = await transcribeRecording(recorder.uri, language);
      if (!text.trim()) return fail("transcription");
      setQuestion(text);
      await ask(text);
    } catch (e) {
      fail(e instanceof VoiceApiError ? e.code : "transcription");
    } finally {
      setBusy(false);
    }
  }
  function record() {
    setError("");
    const action = recording.isRecording ? finishRecording : startRecording;
    void action().catch(() => fail("transcription"));
  }
  return (
    <Screen dark>
      <Row>
        <Txt
          accessibilityRole="header"
          style={{ color: c.white, fontSize: 22, fontWeight: "700" }}
        >
          {t("voice.askTitle")}
        </Txt>
        <Button
          secondary
          title="×"
          accessibilityLabel={t("voice.close")}
          onPress={() => router.replace("/roadmap")}
        />
      </Row>
      <View style={{ paddingVertical: 20, gap: 20 }}>
        <Kiko pulse={recording.isRecording} size={180} />
        <Txt
          accessibilityLiveRegion="polite"
          style={{ textAlign: "center", color: c.lightBlue }}
        >
          {recording.isRecording
            ? t("voice.listening")
            : busy
              ? t("voice.thinking")
              : t("voice.askIntro")}
        </Txt>
      </View>
      <Button
        secondary
        title={
          recording.isRecording
            ? `■ ${t("voice.stopRecording")}`
            : `♩ ${t("voice.record")}`
        }
        accessibilityLabel={
          recording.isRecording ? t("voice.stopRecording") : t("voice.record")
        }
        accessibilityHint={t("voice.recordHint")}
        disabled={busy}
        onPress={record}
      />
      <TextInput
        accessibilityLabel={t("voice.questionLabel")}
        placeholder={t("voice.example")}
        placeholderTextColor={c.midBlue}
        value={question}
        onChangeText={setQuestion}
        multiline
        style={{
          backgroundColor: c.white,
          borderRadius: 20,
          padding: 20,
          minHeight: 110,
          color: c.darkBlue,
          fontSize: 18,
          textAlignVertical: "top",
        }}
      />
      <Button
        title={busy ? t("voice.thinking") : `${t("voice.askButton")} →`}
        accessibilityLabel={busy ? t("voice.thinking") : t("voice.askButton")}
        disabled={busy || !question.trim() || recording.isRecording}
        onPress={() => void ask(question)}
      />
      {demo && (
        <>
          <Label light>{t("voice.demoMode")}</Label>
          <Button
            secondary
            title={t("voice.tryExample")}
            onPress={() => {
              setQuestion(t("voice.example"));
              void ask(t("voice.example"));
            }}
          />
        </>
      )}
      {error !== "" && (
        <Txt accessibilityLiveRegion="assertive" style={{ color: c.coinGold }}>
          {error}
        </Txt>
      )}
      {answer !== "" && (
        <>
          <Card>
            <Txt accessibilityLiveRegion="polite">{answer}</Txt>
            <Label>
              {demo ? t("voice.sampleGuide") : t("voice.kikoResponse")}
            </Label>
            <Button
              secondary
              title={t("voice.readAnswer")}
              onPress={() => void speak(answer, { language, country })}
            />
          </Card>
          <Button
            title={
              added ? `✓ ${t("voice.added")}` : `✦ ${t("voice.makeLesson")}`
            }
            accessibilityLabel={
              added ? t("voice.added") : t("voice.makeLesson")
            }
            disabled={added}
            onPress={() => {
              addBonus(BONUS_TITLE);
              setAdded(true);
            }}
          />
          {added && (
            <Button
              secondary
              title={`${t("roadmap")} →`}
              accessibilityLabel={t("roadmap")}
              onPress={() => router.replace("/roadmap")}
            />
          )}
        </>
      )}
    </Screen>
  );
}

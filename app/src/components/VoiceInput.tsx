import React, { useState } from "react";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as Speech from "expo-speech";
import { useTranslation } from "react-i18next";
import { transcribeRecording } from "../api/voice";
import { useApp } from "../state/useApp";
import { Button, Txt } from "./ui";

/** Record on demand and deliver a server transcript to the current screen. */
export function VoiceInput({
  onText,
}: {
  onText: (text: string) => void | Promise<void>;
}) {
  const language = useApp((state) => state.language);
  const readAloud = useApp((state) => state.readAloud);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recording = useAudioRecorderState(recorder);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { t } = useTranslation();
  function announce(key: string) {
    const text = t(key);
    setMessage(text);
    if (readAloud) Speech.speak(text, { language });
  }
  async function record() {
    setMessage("");
    try {
      if (recording.isRecording) {
        setBusy(true);
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false });
        if (!recorder.uri) throw new Error("Recording has no URI");
        const transcript = await transcribeRecording(recorder.uri, language);
        if (transcript.is_fixture) announce("voiceFixture");
        if (transcript.text.trim()) await onText(transcript.text);
        else announce("voice.askKiko.nothingHeard");
      } else {
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (!permission.granted) {
          announce("voice.microphoneDenied");
          return;
        }
        await Speech.stop();
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        await recorder.prepareToRecordAsync();
        recorder.record();
      }
    } catch {
      announce("voice.askKiko.error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        secondary
        title={t(
          busy
            ? "quizLoading"
            : recording.isRecording
              ? "voiceStop"
              : "voiceRecord",
        )}
        disabled={busy}
        onPress={() => void record()}
      />
      {message && <Txt accessibilityLiveRegion="polite">{message}</Txt>}
    </>
  );
}

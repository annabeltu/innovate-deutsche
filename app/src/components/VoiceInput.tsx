import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
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
import { Button, COMPACT_BUTTON_HEIGHT, DISABLED_OPACITY, Txt } from "./ui";
import { colors, depth, radii } from "../theme/tokens";

/**
 * Record on demand and deliver a server transcript to the current screen.
 * `message` is an i18n key for anything the learner should hear or read
 * (nothing heard, microphone off, an error).
 */
export function useVoiceReply(onText: (text: string) => void | Promise<void>) {
  const language = useApp((state) => state.language);
  const readAloud = useApp((state) => state.readAloud);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recording = useAudioRecorderState(recorder);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { t } = useTranslation();
  function announce(key: string) {
    const text = t(key);
    setMessage(key);
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
        if (useApp.getState().language !== language) return;
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
  return {
    record,
    busy,
    isRecording: recording.isRecording,
    message,
  };
}

/** Full-width "Record a reply" button with its status message below. */
export function VoiceInput({
  onText,
}: {
  onText: (text: string) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const { record, busy, isRecording, message } = useVoiceReply(onText);
  return (
    <>
      <Button
        secondary
        title={t(
          busy ? "quizLoading" : isRecording ? "voiceStop" : "voiceRecord",
        )}
        disabled={busy}
        onPress={() => void record()}
      />
      {message && <Txt accessibilityLiveRegion="polite">{t(message)}</Txt>}
    </>
  );
}

const MIC_ICON_SIZE = 24;

/**
 * Round "Record a reply" button that sits beside a 56 pt primary action.
 * Status messages go to `onMessage` so the screen can place them.
 */
export function VoiceMicButton({
  onText,
  onMessage,
}: {
  onText: (text: string) => void | Promise<void>;
  onMessage: (messageKey: string) => void;
}) {
  const { t } = useTranslation();
  const { record, busy, isRecording, message } = useVoiceReply(onText);
  useEffect(() => onMessage(message), [message, onMessage]);
  const label = t(
    busy ? "quizLoading" : isRecording ? "voiceStop" : "voiceRecord",
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={t("voice.lesson.help")}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={() => void record()}
    >
      {({ pressed }) => (
        <View
          style={{
            width: COMPACT_BUTTON_HEIGHT,
            height: COMPACT_BUTTON_HEIGHT,
            borderRadius: radii.pill,
            backgroundColor: isRecording ? colors.errorText : colors.white,
            borderBottomWidth: pressed ? depth.option / 2 : depth.option,
            borderBottomColor: isRecording ? colors.darkBlue : colors.lightBlue,
            marginTop: pressed ? depth.option / 2 : 0,
            alignItems: "center",
            justifyContent: "center",
            opacity: busy ? DISABLED_OPACITY : 1,
          }}
        >
          <Feather
            name={isRecording ? "square" : "mic"}
            size={MIC_ICON_SIZE}
            color={isRecording ? colors.white : colors.deepBlue}
          />
        </View>
      )}
    </Pressable>
  );
}

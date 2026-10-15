import { useState } from "react";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as Speech from "expo-speech";
import { useTranslation } from "react-i18next";
import { useKikoTranscription } from "../api/assistant";
import { useApp } from "../state/useApp";

/** Request permission only when recording starts and restore audio mode after stopping. */
export function useKikoRecorder(onTranscript: (text: string) => void) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recording = useAudioRecorderState(recorder);
  const transcribe = useKikoTranscription();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { t } = useTranslation();
  const language = useApp((state) => state.language);
  const readAloud = useApp((state) => state.readAloud);
  const record = async () => {
    if (busy || transcribe.isPending) return;
    setError("");
    setBusy(true);
    try {
      if (recording.isRecording) {
        try {
          await recorder.stop();
        } finally {
          await setAudioModeAsync({ allowsRecording: false });
        }
        if (!recorder.uri) throw new Error("askScreen.voiceUnavailable");
        const text = await transcribe.mutateAsync({
          uri: recorder.uri,
          language,
        });
        onTranscript(text);
      } else {
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (!permission.granted) throw new Error("askScreen.permissionDenied");
        await Speech.stop();
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        try {
          await recorder.prepareToRecordAsync();
          recorder.record();
        } catch (error) {
          await setAudioModeAsync({ allowsRecording: false });
          throw error;
        }
      }
    } catch (caught) {
      const key =
        caught instanceof Error &&
        caught.message === "askScreen.permissionDenied"
          ? caught.message
          : "askScreen.voiceUnavailable";
      setError(t(key));
      if (readAloud) Speech.speak(t(key), { language });
    } finally {
      setBusy(false);
    }
  };
  return {
    record,
    isRecording: recording.isRecording,
    busy: busy || transcribe.isPending,
    error,
  };
}

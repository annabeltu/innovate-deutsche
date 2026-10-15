import React, { useEffect, useState } from "react";
import { TextInput, View, Platform } from "react-native";
import { router } from "expo-router";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as Speech from "expo-speech";
import { useApp } from "../state/useApp";
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
const example = "How do I send money to my mom in another country?";
export default function Ask() {
  const s = useApp();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recording = useAudioRecorderState(recorder);
  useEffect(
    () => () => {
      void Speech.stop();
    },
    [],
  );
  async function ask(text: string) {
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    setAdded(false);
    try {
      const base = process.env.EXPO_PUBLIC_API_URL;
      if (!base) {
        setAnswer(
          "You can use a trusted bank or mobile money service. Compare the fee, check the exchange rate, and never share your PIN.",
        );
        return;
      }
      const response = await fetch(`${base}/v1/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          country: s.country,
          language: s.language,
        }),
      });
      if (!response.ok)
        throw new Error("Kiko could not connect. Please try again.");
      const data = await response.json();
      if (typeof data.answer !== "string")
        throw new Error("Kiko received an unexpected response.");
      setAnswer(data.answer);
      if (s.readAloud) Speech.speak(data.answer, { language: s.language });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }
  async function record() {
    setError("");
    try {
      if (recording.isRecording) {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false });
        const base = process.env.EXPO_PUBLIC_API_URL;
        if (!base) {
          setError(
            "Recording saved for this session. Connect the voice API to transcribe it, or type your question below.",
          );
          return;
        }
        setBusy(true);
        const body = new FormData();
        if (Platform.OS === "web") {
          const blob = await (await fetch(recorder.uri!)).blob();
          body.append("file", blob, "question.webm");
        } else
          body.append("file", {
            uri: recorder.uri,
            name: "question.m4a",
            type: "audio/mp4",
          } as unknown as Blob);
        const response = await fetch(`${base}/v1/voice/transcribe`, {
          method: "POST",
          body,
        });
        if (!response.ok)
          throw new Error("Transcription failed. Please type your question.");
        const data = await response.json();
        if (typeof data.text !== "string")
          throw new Error("No transcript was returned.");
        setQuestion(data.text);
        await ask(data.text);
      } else {
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (!permission.granted) {
          setError(
            "Microphone access is off. You can still type your question.",
          );
          return;
        }
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        await recorder.prepareToRecordAsync();
        recorder.record();
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Recording failed. Please type your question.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen dark>
      <Row>
        <Txt style={{ color: c.white, fontSize: 22, fontWeight: "700" }}>
          Ask Kiko
        </Txt>
        <Button
          secondary
          title="×"
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
            ? "Kiko is listening…"
            : busy
              ? "Kiko is thinking…"
              : "Big questions. Small, helpful steps."}
        </Txt>
      </View>
      <Button
        secondary
        title={
          recording.isRecording ? "■ Stop recording" : "♩ Record a question"
        }
        disabled={busy}
        onPress={() => void record()}
      />
      <TextInput
        accessibilityLabel="Your question for Kiko"
        placeholder={example}
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
        title={busy ? "Thinking…" : "Ask Kiko →"}
        disabled={busy || !question.trim() || recording.isRecording}
        onPress={() => void ask(question)}
      />
      {!process.env.EXPO_PUBLIC_API_URL && (
        <>
          <Label light>DEMO MODE · SAMPLE ANSWER</Label>
          <Button
            secondary
            title="Try the example question"
            onPress={() => {
              setQuestion(example);
              void ask(example);
            }}
          />
        </>
      )}
      {error && (
        <Txt accessibilityLiveRegion="polite" style={{ color: "#FFE08A" }}>
          {error}
        </Txt>
      )}
      {answer && (
        <>
          <Card>
            <Txt accessibilityLiveRegion="polite">{answer}</Txt>
            <Label>
              {process.env.EXPO_PUBLIC_API_URL
                ? "KIKO RESPONSE"
                : "SAMPLE · COUNTRY GUIDE"}
            </Label>
            <Button
              secondary
              title="Read answer aloud"
              onPress={() => Speech.speak(answer, { language: s.language })}
            />
          </Card>
          <Button
            title={
              added ? "✓ Added to your roadmap" : "✦ Turn this into a lesson"
            }
            disabled={added}
            onPress={() => {
              s.addBonus("Sending money abroad");
              setAdded(true);
            }}
          />
          {added && (
            <Button
              secondary
              title="See my roadmap →"
              onPress={() => router.replace("/roadmap")}
            />
          )}
        </>
      )}
    </Screen>
  );
}

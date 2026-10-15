import React from "react";
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import { render, screen, fireEvent } from "@testing-library/react-native";
import {
  AudioModule,
  useAudioRecorderState,
  setAudioModeAsync,
} from "expo-audio";
import * as Speech from "expo-speech";
import { transcribeRecording } from "../../api/voice";
import { VoiceInput } from "../VoiceInput";
import { useApp } from "../../state/useApp";
import "../../i18n";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);
jest.mock("expo-audio", () => ({
  AudioModule: { requestRecordingPermissionsAsync: jest.fn() },
  RecordingPresets: { HIGH_QUALITY: {} },
  setAudioModeAsync: jest.fn(),
  useAudioRecorderState: jest.fn(),
  useAudioRecorder: () => ({
    uri: "file:///reply.m4a",
    stop: jest.fn(),
    prepareToRecordAsync: jest.fn(),
    record: jest.fn(),
  }),
}));
jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock("../../api/voice", () => ({ transcribeRecording: jest.fn() }));
jest.mock("../ui", () => {
  const native = jest.requireActual("react-native");
  return { Button: native.Button, Txt: native.Text };
});

beforeEach(() => {
  jest.clearAllMocks();
  useApp.setState({ language: "en", readAloud: true });
  jest
    .mocked(useAudioRecorderState)
    .mockReturnValue({ isRecording: false } as ReturnType<
      typeof useAudioRecorderState
    >);
});

it("requests permission on demand and speaks a denied-permission explanation", async () => {
  jest
    .mocked(AudioModule.requestRecordingPermissionsAsync)
    .mockResolvedValue({ granted: false } as Awaited<
      ReturnType<typeof AudioModule.requestRecordingPermissionsAsync>
    >);
  await render(<VoiceInput onText={jest.fn()} />);
  expect(AudioModule.requestRecordingPermissionsAsync).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Record a reply" }));
  expect(Speech.speak).toHaveBeenCalledWith(
    expect.stringContaining("microphone"),
    { language: "en" },
  );
});

it("delivers the transcript in the active language after stopping", async () => {
  useApp.setState({ language: "sw" });
  jest
    .mocked(useAudioRecorderState)
    .mockReturnValue({ isRecording: true } as ReturnType<
      typeof useAudioRecorderState
    >);
  jest
    .mocked(transcribeRecording)
    .mockResolvedValue({ text: "ndiyo", language: "sw", is_fixture: false });
  const onText = jest.fn();
  await render(<VoiceInput onText={onText} />);
  await fireEvent.press(screen.getByRole("button", { name: "Stop recording" }));
  expect(transcribeRecording).toHaveBeenCalledWith("file:///reply.m4a", "sw");
  expect(onText).toHaveBeenCalledWith("ndiyo");
});

it("prepares recording only after microphone permission is granted", async () => {
  jest
    .mocked(AudioModule.requestRecordingPermissionsAsync)
    .mockResolvedValue({ granted: true } as Awaited<
      ReturnType<typeof AudioModule.requestRecordingPermissionsAsync>
    >);
  await render(<VoiceInput onText={jest.fn()} />);
  await fireEvent.press(screen.getByRole("button", { name: "Record a reply" }));
  expect(setAudioModeAsync).toHaveBeenCalledWith({
    allowsRecording: true,
    playsInSilentMode: true,
  });
  expect(transcribeRecording).not.toHaveBeenCalled();
});

it("labels fixture transcripts so sample data cannot pass as a live recording", async () => {
  jest
    .mocked(useAudioRecorderState)
    .mockReturnValue({ isRecording: true } as ReturnType<
      typeof useAudioRecorderState
    >);
  jest
    .mocked(transcribeRecording)
    .mockResolvedValue({ text: "sample", language: "en", is_fixture: true });
  await render(<VoiceInput onText={jest.fn()} />);
  await fireEvent.press(screen.getByRole("button", { name: "Stop recording" }));
  expect(
    screen.getByText(
      "Development sample transcript; this is not your recording.",
    ),
  ).toBeTruthy();
});

it("speaks upload errors instead of pretending a transcript was received", async () => {
  jest
    .mocked(useAudioRecorderState)
    .mockReturnValue({ isRecording: true } as ReturnType<
      typeof useAudioRecorderState
    >);
  jest.mocked(transcribeRecording).mockRejectedValue(new Error("offline"));
  const onText = jest.fn();
  await render(<VoiceInput onText={onText} />);
  await fireEvent.press(screen.getByRole("button", { name: "Stop recording" }));
  expect(onText).not.toHaveBeenCalled();
  expect(
    screen.getByText("Sorry, something went wrong. Please try again."),
  ).toBeTruthy();
});

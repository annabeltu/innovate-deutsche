import { act, renderHook } from "@testing-library/react-native";
import { AudioModule, setAudioModeAsync } from "expo-audio";
import * as Speech from "expo-speech";
import { useKikoRecorder } from "../use-kiko-recorder";
import { useApp } from "../../state/useApp";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("expo-speech", () => ({ stop: jest.fn(), speak: jest.fn() }));
jest.mock("../../api/assistant", () => ({
  useKikoTranscription: () => ({ isPending: false, mutateAsync: jest.fn() }),
}));
jest.mock("expo-audio", () => ({
  AudioModule: {
    requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: false })),
  },
  RecordingPresets: { HIGH_QUALITY: {} },
  setAudioModeAsync: jest.fn(),
  useAudioRecorder: () => ({
    prepareToRecordAsync: jest.fn(),
    record: jest.fn(),
    stop: jest.fn(),
  }),
  useAudioRecorderState: () => ({ isRecording: false }),
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
it("requests permission only at recording time and speaks a denied-permission explanation", async () => {
  useApp.getState().set({ readAloud: true, language: "en" });
  const { result } = renderHook(() => useKikoRecorder(jest.fn()));
  expect(AudioModule.requestRecordingPermissionsAsync).not.toHaveBeenCalled();
  await act(async () => result.current.record());
  expect(result.current.error).toBe("askScreen.permissionDenied");
  expect(Speech.speak).toHaveBeenCalledWith("askScreen.permissionDenied", {
    language: "en",
  });
  expect(setAudioModeAsync).not.toHaveBeenCalled();
});

/** Jest stand-in for expo-audio, whose native module is missing under jest-expo. */
const player = () => ({
  addListener: jest.fn(),
  play: jest.fn(),
  remove: jest.fn(),
});
const recorder = {
  prepareToRecordAsync: jest.fn(),
  record: jest.fn(),
  stop: jest.fn(),
  uri: null,
};

export const createAudioPlayer = jest.fn(player);
export const setAudioModeAsync = jest.fn(() => Promise.resolve());
export const AudioModule = {
  requestRecordingPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: true }),
  ),
};
export const RecordingPresets = { HIGH_QUALITY: {} };
export const useAudioRecorder = jest.fn(() => recorder);
export const useAudioRecorderState = jest.fn(() => ({ isRecording: false }));

# 0004. Server-side speech-to-text, deterministic intents, on-device speech fallback
Date: 2026-10-15
Status: Proposed

## Context
Kompass must work by voice alone in English, Spanish and Swahili, and run in Expo Go. React Native has no built-in speech-to-text. Provider keys must never ship in the app (`EXPO_PUBLIC_*` is public). Voice commands must be predictable and testable. A blind learner who says "next" must never trigger something else.

## Options
- **On-device STT library** (e.g. a native speech-recognition module). It's free and offline, but needs a development build (not in Expo Go), and Swahili support varies by OS.
- **Server-side Whisper-compatible API** (chosen for STT). It works in Expo Go, Swahili is supported, and the key stays on the server. It costs money per request and needs a network.
- **LLM intent classification.** It's flexible, but slow, non-deterministic, costs per call, and is hard to test.
- **Keyword intent matching** (chosen). It's fast, free, deterministic and fully unit-tested. It needs maintained synonym lists.
- **Hosted TTS only.** Quality is better, but it fails offline and Swahili quality is unverified.
- **On-device `expo-speech` first, hosted TTS optional** (chosen). It always works and is available in Expo Go; voice quality depends on the phone.

## Decision
`POST /v1/voice/transcribe` calls an OpenAI-compatible transcription API through a small provider interface (`SpeechToTextProvider`). `POST /v1/voice/intent` uses whole-phrase keyword matching with filler words and returns `unknown` unless every word is accounted for. The app speaks with `expo-speech` by default. `POST /v1/voice/speak` is an optional hosted voice behind `TextToSpeechProvider`, and any error there means "use the device".

## Consequences
- Providers can be swapped by implementing one method, with no change to the public API.
- Without `WHISPER_API_KEY`, voice input is unavailable (503). A labeled fixture exists for local development only.
- The synonym lists in `services/intent_vocabulary.py` need native-speaker review, especially Swahili.
- Recordings go to a third-party provider. They are not stored by Kompass.

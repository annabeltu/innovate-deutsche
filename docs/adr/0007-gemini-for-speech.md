# 0007. Gemini for speech-to-text and Swahili read-aloud
Date: 2026-10-15
Status: Proposed

## Context

Kompass must work by voice alone (AGENTS.md §2.4) in English, Spanish and Swahili:

- Learners speak their question to Ask Kiko, which turns it into a bonus lesson. React Native has no built-in speech-to-text, so audio must be transcribed on a server.
- Every screen can be read aloud. On-device speech (`expo-speech`) is instant, free and works offline, but a phone only speaks languages it has a voice for. We could not confirm that iPhones ship a Swahili voice.
- Keys must stay on the API (AGENTS.md §7), and every external call needs a timeout, one retry and a clean fallback.

The approved stack (AGENTS.md §0) named the Whisper API for speech-to-text and had no server-side text-to-speech.

## Options

1. **Whisper for speech-to-text, nothing for read-aloud.** Already approved and handles Swahili. Needs an OpenAI key, and leaves Swahili read-aloud silent on phones without a Swahili voice.
2. **Whisper for speech-to-text plus a second provider for read-aloud.** Covers everything, but means two providers, two keys and two sets of failure handling.
3. **Gemini for both.** `gemini-3.5-transcribe` lists `en-US`, `es-US`, `es-419` and `sw-KE` and takes a language hint. `gemini-3.8-flash-tts` supports Swahili (Flash-Lite TTS does not). That's one Google key, which is the provider the team suggested for lessons too. Both use the newer Interactions API, and the transcription model's preview or stable status isn't documented.

## Decision

Option 3. The API calls Gemini only from `app/speech/gemini.py`, behind two endpoints:

- `POST /v1/voice/transcribe` (audio in, text out)
- `GET /v1/voice/speak` (text in, `audio/wav` out)

The app keeps `expo-speech` as the default read-aloud and calls `/v1/voice/speak` only when the phone has no voice for the active language.

## Consequences

- One secret, `GEMINI_API_KEY`, lives only in the API's `.env`. Without it, the voice endpoints return `503 speech_unavailable`, and the app falls back to typing and on-device speech.
- The free tier is small: 25 transcriptions a day on `gemini-3.5-transcribe` and 10 a day per TTS model. Each job therefore has an ordered list of models (`GEMINI_TRANSCRIBE_MODELS`, `GEMINI_TTS_MODELS`):
  - Transcription falls back to `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite` and `gemini-3.8-flash`, with the versioned prompt `prompts/transcribe_v1.txt`.
  - Read-aloud falls back to `gemini-3.1-flash-tts-preview`, `gemini-2.5-flash-preview-tts`, then `gemini-3.8-flash-lite-tts`, which can't do Swahili.
  - A quota (429) or unknown-model error moves straight to the next model. Timeouts and 5xx errors retry the same model once first.
- Generated speech is cached in memory by text, so a repeated screen costs no quota.
- Every Gemini call has a timeout. Recordings stay in memory, and audio is never logged.
- The inline-audio field name for transcription (`data`) follows the Interactions API's audio output shape. The docs only show file URIs for input, so this must be checked with a real key before the demo.
- Swahili transcription quality is unproven. Test with Kenyan speakers before the demo.
- Server read-aloud costs money per request, which is why on-device speech stays the default and responses are cacheable for a day.
- AGENTS.md §0 should replace Whisper with Gemini once this ADR is accepted.

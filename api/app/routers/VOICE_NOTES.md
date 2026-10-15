# Voice & integration: tasks (@voice-placeholder)

Files: `routers/voice.py`, `schemas/voice.py`, `services/intent.py`, `services/intent_vocabulary.py`, `services/speech_to_text.py`, `services/text_to_speech.py`, `services/voice_provider_http.py`, `app/src/voice/`, `app/src/api/voice.ts`, `.github/`, `docs/VOICE_API.md`, `docs/DEPLOYMENT.md`.

1. **Intent matching.** Done. `POST /v1/voice/intent` matches en/es/sw keywords deterministically, with no LLM. See `docs/VOICE_API.md`.
2. **Speech-to-text.** Done; tested with mocks only. `POST /v1/voice/transcribe` calls Whisper and uses a labeled fixture when `VOICE_DEV_FIXTURES=true` and no key is set.
3. **Text-to-speech.** Done; tested with mocks only. `POST /v1/voice/speak` returns MP3. The app falls back to expo-speech.
4. **CI.** `.github/workflows/ci.yml`. The api job needs `ruff format` applied to `routers/path.py` and `routers/lessons.py` (one blank line each).
5. **Voice-mode building blocks.** Built locally, not committed yet: lesson navigator, Ask Kiko flow, screen-reader hook, locales. They wait for Jest (`jest-expo`) in the app, plus the expo-speech/expo-audio adapters.
6. **Deployment + end-to-end test.** The guide is in `docs/DEPLOYMENT.md`; nothing is deployed yet. The end-to-end voice-only test is blocked on `/v1/path`, `/v1/lessons`, `/v1/ask` and `/v1/bonus-lessons`.
7. **Contract proposal.** Move `schemas/voice.py` into the shared contract. This needs approval from Faraz and Will.

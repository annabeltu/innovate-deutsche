# Voice & integration: first tasks (@voice-placeholder)

Files: `routers/voice.py`, `services/intent.py`, `.github/`, deployment.

1. **Intent matching.** Implement `POST /v1/voice/intent` in `services/intent.py` with keyword matching per language (yes/haan/ndiyo/ja, no/nahin/hapana/nein, repeat, next, back, help, start, option A–D, scam, legit, spoken numbers). Return `unknown` when nothing matches so the app can re-ask. No LLM. Cover it with pytest.
2. **Speech-to-text.** Implement `POST /v1/voice/transcribe` (multipart audio + language → `{text, language}`) with Whisper, and a fixture transcript when no `WHISPER_API_KEY` is set.
3. **Text-to-speech.** Implement `POST /v1/voice/speak` (`{text, language, rate}` → mp3) as an optional higher-quality voice. The app falls back to on-device expo-speech when it fails or is offline.
4. **CI.** Add `.github/workflows/ci.yml` running pytest + ruff for `api/` and eslint + `tsc --noEmit` for `app/` on every PR into `dev` and `main`.
5. **Deployment + end-to-end test.** Deploy the API, document `API_BASE_URL`, and write an end-to-end test of the voice-only flow (setup → onboarding → path → lesson → Ask Kiko → bonus lesson) using only voice intents.

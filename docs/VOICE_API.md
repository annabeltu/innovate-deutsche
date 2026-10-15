# Voice API and voice-mode integration

Owner: voice & integration (`feature/voice-integration`). Live reference: `/docs` on the running API.

> **Contract status: proposal.** `docs/API_CONTRACTS.md` lists the three voice paths but not their shapes. The models below live in `api/app/schemas/voice.py` (an app-side mirror follows with the frontend voice work), outside the shared contract files. Moving them into `shared.py` / `api.ts` / `API_CONTRACTS.md` needs approval from **both** @faraz999shah and @willapat.

All errors use the contract shape `{"error": {"code", "message", "details"}}`.

## `POST /v1/voice/intent`

Maps a short spoken reply to a command. Deterministic keyword matching, no LLM.

Request `{"text": "opción B", "language": "es"}` (`text` ≤ 500 chars).

Response `200`:

```json
{"intent": "option", "option_id": "b", "number": null, "confidence": 0.9, "normalized_text": "opcion b"}
```

| intent | examples (en / es / sw) | extra field |
|---|---|---|
| `yes` | yes, okay / sí, de acuerdo / ndiyo, sawa | |
| `no` | no, not now / no, ahora no / hapana | |
| `repeat` | repeat, say that again / repite, otra vez / rudia, sema tena | |
| `next` | next, continue / siguiente, adelante / ijayo, endelea | |
| `back` | back, go back / atrás, anterior / rudi, nyuma | |
| `help` | help, what can I say / ayuda / msaada | |
| `start` | start, let's go / empezar / anza | |
| `option` | "B", "option C", "I think D" / "la be" / "jibu c" | `option_id`: `a`–`d` |
| `number` | three, number 7, 500 / dos / tatu | `number` |
| `scam` | it's a scam, fake / es una estafa / ni utapeli | |
| `legitimate` | legit, not a scam / no es una estafa / si utapeli | |
| `unknown` | anything else, including questions | |

How matching works: the text is lowercased, and accents and punctuation are stripped. Every word must then be part of a known phrase (longest match first) or a filler word ("please", "I think", "option"). All phrases must agree on one meaning, and the utterance has at most 8 words. That rule is what keeps "What is a loan?" and "yes no" as `unknown`. Words only match whole, so "nextdoor" is not `next`. `confidence` is `1.0` for an exact command, `0.9` when fillers were ignored, and `0` for `unknown`. Synonyms live in `api/app/services/intent_vocabulary.py`.

## `POST /v1/voice/transcribe`

Multipart form: `audio` (file) and `language` (`en` | `es` | `sw`, passed to Whisper as a hint).

Response `200`: `{"text": "¿Qué es un préstamo?", "language": "es", "is_fixture": false}`. `text` is `""` if nothing was heard.

- Allowed types: `audio/m4a`, `audio/x-m4a`, `audio/mp4` (expo-audio's default), `audio/mpeg`, `audio/wav`, `audio/webm`, `audio/ogg`, `audio/flac`. Anything else returns `415 unsupported_audio`.
- Over `VOICE_MAX_AUDIO_BYTES` (default 10 MB) returns `413 audio_too_large`. An empty file returns `400 validation_error`.
- Recordings are held in memory only. They are never written to disk, stored or logged.
- No `WHISPER_API_KEY` returns `503 voice_unavailable`. In local development only, `VOICE_DEV_FIXTURES=true` returns a fixed sample question with `is_fixture: true`. Never enable it in a deployed environment.
- Provider failure returns `502 voice_provider_error`; a timeout (`VOICE_PROVIDER_TIMEOUT_SECONDS`) returns `504 voice_provider_timeout`.

## `POST /v1/voice/speak`

Request `{"text": "...", "language": "sw", "rate": 1.0}` (`text` 1–1500 chars, `rate` 0.5–2.0; use `profile.accessibility.speech_rate`). Response `200` is `audio/mpeg`.

This is an **optional** higher-quality voice. **On-device `expo-speech` is the default and the fallback.** On any error, the app speaks the same text on the device:

- No `TTS_API_KEY` returns `503 voice_unavailable`.
- A language not in `TTS_LANGUAGES` returns `422 unsupported_language`.
- Provider errors and timeouts return `502` / `504`.

**Swahili limitation:** OpenAI's TTS detects the language from the text and is tuned mainly for English. Its Swahili quality has not been verified, so drop `sw` from `TTS_LANGUAGES` if it sounds wrong. On-device Swahili depends on the phone: many Android devices have a Swahili voice, but iOS may not. If no `sw` voice is installed, expo-speech reads with a default voice. Test on the demo phone.

## Contract needed from Faraz: `/v1/ask` and `/v1/bonus-lessons`

These endpoints don't exist yet, and the only description is the task note: "`/v1/ask` returns `answer`, `spoken_answer` and a `confirm_prompt` when it suggests a lesson; `/v1/bonus-lessons` … returns a spoken announcement". The app's voice flow (in progress, not yet committed) depends only on a small adapter interface: `ask(question) → { spokenAnswer, lessonOffer: { confirmPrompt, offerRef } | null }` and `addBonusLesson(offerRef) → announcement`. A small adapter will map whatever is agreed. For voice to work, the contract must provide:

**`POST /v1/ask`**

1. **Request** carries the learner (`user_id`) and the transcript (`question`). Say whether `language` is sent or read from the profile; the answer must be in the learner's language.
2. **Response** has a spoken answer, written for listening: short sentences, no "tap/swipe/see", no markdown or URLs. It's safe to pass straight to TTS.
3. **Response** has a lesson offer, or `null`. When present, it includes:
   - a spoken yes/no question that tells the learner how to answer ("Say yes or no"), in their language;
   - a value that identifies *this* offer for `/v1/bonus-lessons` (an offer id, or the topic plus the question). Without it, the app can't add the exact lesson the learner agreed to.
4. **Errors** use the standard error shape, with distinct codes for "LLM unavailable/timeout" and "question rejected/off-topic", so Kiko can say something specific.
5. **Latency:** expected worst case (the app says "let me think" first, but will time out eventually).

**`POST /v1/bonus-lessons`**

1. **Request** takes `user_id` plus the offer identifier from `/v1/ask`. It's only ever called after an explicit spoken "yes".
2. **Response** has a spoken announcement in the learner's language, plus the new `lesson_id` (and whether the path changed), so the app can refresh the path.
3. **Idempotency:** the same offer submitted twice (a voice retry, or a double "yes") must not add two lessons.
4. **Every card in the generated lesson has the required `voice` block.** Voice mode plays bonus lessons with no special case.

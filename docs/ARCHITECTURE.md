# Architecture

## Monorepo layout

| Folder | What | Owner |
|---|---|---|
| `api/` | FastAPI backend, Python 3.11 | Faraz, Will, voice teammate (per file, see `CODEOWNERS`) |
| `app/` | Expo React Native app, TypeScript | Frontend teammate |
| `data/` | Findex data, country packs, lesson templates, question bank, fixtures | Data & content teammate |
| `docs/` | Contracts and architecture | Faraz + Will (contracts) |
| `.github/` | PR template, CI | Voice & integration teammate |

## Request flow

```
Expo app ──HTTP /v1──▶ FastAPI
                         ├─ routers/profile.py  (Will)   ─▶ services/profile_store.py ─▶ SQLite
                         ├─ routers/path.py     (Faraz)  ─▶ services/scoring.py + profile_store.get_profile()
                         ├─ routers/lessons.py  (Faraz)  ─▶ services/lesson_service.py ─▶ profile_store.get_profile(), needs.py, lesson_builder.py ─▶ lesson_wording.py ─▶ llm/client.py
                         │                                   └─ voice_script.py, validation.py
                         └─ routers/voice.py    (voice)  ─▶ services/intent.py, speech-to-text, text-to-speech
```

1. **Setup + onboarding:** the app posts answers to `/v1/onboarding`, gets a quiz, then submits it. Will's API stores the `LearnerProfile`.
2. **Path:** Faraz's API reads the profile with `profile_store.get_profile(user_id)`, which is an in-process call today and could become HTTP later. It scores topics with Findex data from `data/` and returns an ordered path.
3. **Lessons:** `GET /v1/lessons/{lesson_id}` reads two models: Will's `LearnerProfile` (via `get_profile()`) and `LearnerNeeds`, built from `data/findex` for the learner's country and age group. The base lesson from `data/lesson_templates` keeps only the cards that fit the learner's difficulty, life stage and goal, and code fills every fact (Findex numbers, local facts from `data/question_bank/countries.json`). Every card carries a `voice` block. The LLM (OpenAI, ADR 0001) rewrites only the wording into the learner's language; the result is validated, retried once, and otherwise served in English. Caching is a follow-up.
4. **Ask Kiko:** speech goes to `/v1/voice/transcribe`, then to `/v1/ask`. On "yes", `/v1/bonus-lessons` adds a new lesson to the path.
5. **Voice mode:** the app speaks each screen's text, listens, and maps the reply to an intent with `/v1/voice/intent`.

## Contracts

`docs/API_CONTRACTS.md`, `api/app/schemas/shared.py` and `app/src/types/api.ts` must stay in sync and are owned jointly by Faraz and Will.

## Frontend lesson integration

Expo uses `EXPO_PUBLIC_API_URL` for customized lessons and lesson requests.
The learner is created once from onboarding (quiz submission or explicit quiz skip); language and accessibility changes
patch that learner instead of recreating it. The roadmap language chooser
refreshes lesson queries after saving. Lesson completion is posted to the
profile API before local coins and completion are awarded. Generation errors
are shown without adding a local placeholder lesson.

Persisted app state version 3 clears the old preview's seeded progress once
(including its learner linkage and bonus lessons). New learners start at zero
coins, zero streak and no completions; version 3 progress persists normally.

### Integration of the latest onboarding and voice updates

The confidence screen offers a baseline quiz or a direct path. Quiz submission
stores its learner id for subsequent path and lesson requests; direct path
creation skips the quiz explicitly. Both paths share the typed fetch client
and the root TanStack Query provider. `GET /v1/path/{user_id}` joins the stored
profile with Findex needs and the existing pure scoring service. The new path
preview keeps its design while using this server ordering.

VoiceInput records on demand with Expo SDK 54, uploads `audio` and `language`
through the same client, and labels development fixture transcripts. Ask Kiko
requests real bonus lessons after typed submission or spoken confirmation.
Quiz and lesson replies use the merged multilingual intent endpoint for
options, next/back, repeat and help. Read-aloud uses expo-speech; the hosted
TTS endpoint remains available as an optional service. CORS is configured once,
accepting both CORS_ALLOWED_ORIGINS and the voice branch's CORS_ALLOW_ORIGINS
alias. Microphone/device checks are still needed before a release.

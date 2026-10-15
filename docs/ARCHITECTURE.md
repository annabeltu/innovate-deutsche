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

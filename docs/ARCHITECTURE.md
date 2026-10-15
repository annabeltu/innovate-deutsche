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
                         ├─ routers/lessons.py  (Faraz)  ─▶ services/lesson_builder.py ─▶ llm/client.py
                         │                                   └─ voice_script.py, validation.py
                         └─ routers/voice.py    (voice)  ─▶ services/intent.py, speech-to-text, text-to-speech
```

1. **Setup + onboarding:** the app posts answers to `/v1/onboarding`, gets a quiz, then submits it. Will's API stores the `LearnerProfile`.
2. **Path:** Faraz's API reads the profile with `profile_store.get_profile(user_id)`, which is an in-process call today and could become HTTP later. It scores topics with Findex data from `data/` and returns an ordered path.
3. **Lessons:** templates from `data/lesson_templates` are filled with facts by code. The LLM rewrites only the wording. Each card gets a `voice` block, then the lesson is validated and cached.
4. **Ask Kiko:** speech goes to `/v1/voice/transcribe`, then to `/v1/ask`. On "yes", `/v1/bonus-lessons` adds a new lesson to the path.
5. **Voice mode:** the app speaks each screen's text, listens, and maps the reply to an intent with `/v1/voice/intent`.

## Contracts

`docs/API_CONTRACTS.md`, `api/app/schemas/shared.py` and `app/src/types/api.ts` must stay in sync and are owned jointly by Faraz and Will.

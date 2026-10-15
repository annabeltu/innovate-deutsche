# Kompass API Contracts

> Full detail lives in the team's Kompass API Contracts doc; this file is the in-repo summary.

Changes to this file, `api/app/schemas/shared.py` or `app/src/types/api.ts` need approval from both @faraz999shah and @willapat. Change all three together.

## Conventions

- Base path `/v1`, JSON bodies, `snake_case` keys
- Scores and confidences are decimals from 0 to 1
- Money is an integer plus an ISO 4217 currency code (`USD`, `MXN`, `KES`)
- Error shape on every endpoint:

```json
{"error": {"code": "string", "message": "string", "details": {}}}
```

## Enums

| Name | Values |
|---|---|
| country | `US`, `MX`, `KE` |
| language | `en`, `es`, `sw` |
| topic | `accounts`, `saving`, `borrowing`, `scams`, `budget` |
| life_stage | `student`, `first_job`, `parent`, `retired` |
| goal | `save_more`, `avoid_debt`, `stay_safe_online`, `handle_emergencies` |
| savings_habit | `cash_at_home`, `savings_group`, `bank`, `gold_or_assets`, `none` |
| comfort | `1` (low), `2`, `3` (high) |
| difficulty | `1`, `2`, `3` |

Languages offered per country (any other pair returns `422 unsupported_language`):

| country | languages |
|---|---|
| `US` | `en`, `es` |
| `MX` | `es`, `en` |
| `KE` | `en`, `sw` |

## LearnerProfile

Will's API writes it; Faraz's API reads it. It is the only handoff between the two APIs.

```json
{
  "user_id": "u_8f3c2a91",
  "country": "KE",
  "language": "sw",
  "accessibility": {
    "voice_mode": true,
    "read_aloud": true,
    "simple_mode": true,
    "large_text": false,
    "speech_rate": 1.0
  },
  "life_stage": "student",
  "goal": "save_more",
  "comfort": 1,
  "savings_habit": "cash_at_home",
  "topic_scores": {
    "accounts": {"confidence": 0.6, "quiz_score": 0.5, "proficiency": 0.54, "completed": false}
  },
  "bonus_lesson_ids": [],
  "updated_at": "2026-10-15T15:30:00Z"
}
```

`topic_scores` has one entry per topic.

**proficiency = 0.4 × confidence + 0.6 × quiz_score**, rounded half up to 2 decimals. If the quiz is skipped, `quiz_score` is `null` and proficiency equals confidence.

## Endpoints

### LearnerProfile API (Will)

| Method | Path |
|---|---|
| POST | `/v1/onboarding` |
| POST | `/v1/quiz/{quiz_id}/submit` |
| POST | `/v1/quiz/{quiz_id}/skip` |
| GET | `/v1/profile/{user_id}` |
| PATCH | `/v1/profile/{user_id}/accessibility` |
| POST | `/v1/profile/{user_id}/lesson-results` |

#### Onboarding and baseline quiz

`POST /v1/onboarding` request (`accessibility` is optional; every topic needs a confidence from 0 to 1):

```json
{
  "language": "sw",
  "country": "KE",
  "accessibility": {"read_aloud": true, "simple_mode": true},
  "life_stage": "student",
  "goal": "save_more",
  "comfort": 1,
  "savings_habit": "cash_at_home",
  "confidence": {"accounts": 0.6, "saving": 0.3, "borrowing": 0.2, "scams": 0.5, "budget": 0.4}
}
```

Response `201`: `user_id` plus the quiz, written entirely in the learner's language with country details (currency, ID, mobile money, deposit insurer) filled in:

```json
{
  "user_id": "u_8f3c2a91",
  "quiz": {
    "quiz_id": "qz_41d0a2b7",
    "language": "sw",
    "questions": [
      {
        "question_id": "qz_41d0a2b7_1",
        "topic": "accounts",
        "difficulty": 2,
        "prompt": "Ni njia gani salama ya kutuma pesa kwa familia haraka?",
        "options": [{"option_id": "a", "text": "M-Pesa"}, {"option_id": "b", "text": "..."}, {"option_id": "c", "text": "..."}],
        "voice": {"speak_text": "Swali la 1 kati ya 10. ... Chaguo A: M-Pesa. ... Sema A, B au C kujibu. Sema rudia kusikia tena."}
      }
    ]
  }
}
```

- 10 questions, 2 per topic in topic order, from the pre-written bank in `data/question_bank/`.
- Every learner gets one easy (difficulty 1) and one hard (difficulty 3) question per topic, easy first, regardless of their sliders. Everyone is measured on the same scale, so `quiz_score` 0 means missing the basics, 0.5 means basics only, and 1 means basics plus harder material. Confidence still counts through the proficiency formula.
- The answer key never leaves the server; it is stored with `quiz_id`.

`POST /v1/quiz/{quiz_id}/submit` request `{"user_id": "...", "answers": [{"question_id": "...", "option_id": "b"}]}`. Response `200` is `{"profile": LearnerProfile, "results": [{"question_id", "correct", "correct_option_id"}]}`. Unanswered questions count as wrong; an unknown question or option, or the same question twice, is `400 validation_error`.

`POST /v1/quiz/{quiz_id}/skip` request `{"user_id": "..."}`. Response `200` is `{"profile": LearnerProfile}`.

Submitting or skipping a finished quiz returns `409 quiz_already_submitted`; a quiz that does not exist or belongs to another user returns `404 quiz_not_found`. `GET /v1/profile/{user_id}` returns `404 profile_not_found` until the quiz is submitted or skipped.

#### Profile updates

`PATCH /v1/profile/{user_id}/accessibility` takes any subset of the accessibility fields, for example `{"voice_mode": true, "speech_rate": 0.8}`. Fields left out keep their value. Response `200` is the full `LearnerProfile`.

`POST /v1/profile/{user_id}/lesson-results` request `{"lesson_id": "saving", "correct": 4, "total": 5, "completed": true}`. Response `200`:

```json
{"topic": "saving", "proficiency": 0.55, "completed": true, "path_refresh_needed": true}
```

- New proficiency = 0.5 × old proficiency + 0.5 × (correct / total), rounded half up to 2 decimals.
- `completed` never goes back to `false` once a topic is finished.
- `path_refresh_needed` is `true` when the topic's difficulty band changed (below 0.4 → 1, below 0.7 → 2, otherwise 3), so the app calls `POST /v1/path` again.
- A bonus `lesson_id` from the profile's `bonus_lesson_ids` changes nothing in `topic_scores`; `topic` and `proficiency` are `null`. Any other unknown `lesson_id` returns `404 lesson_not_found`. `correct > total` or `total < 1` returns `400 validation_error`.

### Path + Lessons API (Faraz)

| Method | Path |
|---|---|
| POST | `/v1/path` |
| GET | `/v1/path/{user_id}` |
| GET | `/v1/lessons/{lesson_id}?user_id=` |
| POST | `/v1/ask` |
| POST | `/v1/bonus-lessons` |

### Voice API (voice teammate)

| Method | Path |
|---|---|
| POST | `/v1/voice/transcribe` |
| POST | `/v1/voice/intent` |
| GET | `/v1/voice/speak` |

Speech runs on Gemini, server-side only (see `docs/adr/0007-gemini-for-speech.md`). Both endpoints are rate-limited per client (`429 rate_limited`) and return `503 speech_unavailable` if `GEMINI_API_KEY` is missing or Gemini fails twice in a row.

`POST /v1/voice/transcribe` takes `multipart/form-data` with `audio` (m4a, wav, webm, ogg, mp3 or aac, up to 5 MB) and `language` (`en`, `es` or `sw`, used as a hint). Response `200`:

```json
{"text": "How do I send money to my mom in another country?", "language": "en"}
```

Errors: `400 validation_error` (missing field, unknown language, empty recording), `413 audio_too_large`, `415 unsupported_audio_type`. Recordings stay in memory and are never stored.

`GET /v1/voice/speak?text=...&language=sw` returns `audio/wav` of the text read aloud (1–1000 characters). The app uses it only when the phone has no built-in voice for the language, usually Swahili. It is a `GET`, so an audio player can stream it straight from the URL; responses may be cached for a day.

## Lesson cards

Card types: `concept`, `bridge`, `mc_quiz`, `drag_match`, `compare_chart`, `clause_tap`, `scam_swipe`, `budget_sim`, `takeaway`.

Every card has a **required** `voice` block, so every lesson, including AI-generated bonus lessons, can be played entirely by voice:

```json
"voice": {
  "speak_text": "Full spoken version of the card, including every option with its letter.",
  "answer_mode": "say_option",
  "spoken_options": {"a": "option text", "b": "option text"},
  "correct_feedback": "Spoken feedback when right.",
  "incorrect_feedback": "Spoken feedback when wrong, including the explanation."
}
```

## Scoring

**priority = 0.4 × findex_gap + 0.4 × (1 − proficiency) + 0.2 × goal_match**

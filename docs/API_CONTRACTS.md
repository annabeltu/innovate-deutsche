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
- Difficulty follows each topic's slider: confidence below 0.4 → 1, below 0.7 → 2, otherwise 3.
- The answer key never leaves the server; it is stored with `quiz_id`.

`POST /v1/quiz/{quiz_id}/submit` request `{"user_id": "...", "answers": [{"question_id": "...", "option_id": "b"}]}`. Response `200` is `{"profile": LearnerProfile, "results": [{"question_id", "correct", "correct_option_id"}]}`. Unanswered questions count as wrong; an unknown question or option, or the same question twice, is `400 validation_error`.

`POST /v1/quiz/{quiz_id}/skip` request `{"user_id": "..."}`. Response `200` is `{"profile": LearnerProfile}`.

Submitting or skipping a finished quiz returns `409 quiz_already_submitted`; a quiz that does not exist or belongs to another user returns `404 quiz_not_found`. `GET /v1/profile/{user_id}` returns `404 profile_not_found` until the quiz is submitted or skipped.

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
| POST | `/v1/voice/speak` |

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

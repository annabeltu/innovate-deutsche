# Kompass API Contracts

> Full detail lives in the team's Kompass API Contracts doc; this file is the in-repo summary.

Changes to this file, `api/app/schemas/shared.py` or `app/src/types/api.ts` need approval from both @faraz999shah and @willapat. Change all three together.

## Conventions

- Base path `/v1`, JSON bodies, `snake_case` keys
- Scores and confidences are decimals from 0 to 1
- Money is an integer plus an ISO 4217 currency code (`INR`, `KES`, `EUR`)
- Error shape on every endpoint:

```json
{"error": {"code": "string", "message": "string", "details": {}}}
```

## Enums

| Name | Values |
|---|---|
| country | `IN`, `KE`, `DE` |
| language | `en`, `hi`, `sw`, `de` |
| topic | `accounts`, `saving`, `borrowing`, `scams`, `budget` |
| life_stage | `student`, `first_job`, `parent`, `retired` |
| goal | `save_more`, `avoid_debt`, `stay_safe_online`, `handle_emergencies` |
| savings_habit | `cash_at_home`, `savings_group`, `bank`, `gold_or_assets`, `none` |
| difficulty | `1`, `2`, `3` |

## LearnerProfile

Will's API writes it; Faraz's API reads it. It is the only handoff between the two APIs.

```json
{
  "user_id": "u_8f3c2a91",
  "country": "IN",
  "language": "hi",
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

**proficiency = 0.4 × confidence + 0.6 × quiz_score**

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

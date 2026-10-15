# Kompass API Contracts

> Full detail lives in the team's Kompass API Contracts doc; this file is the in-repo summary.

Changes to this file, `api/app/schemas/shared.py` or `app/src/types/api.ts` need approval from both @faraz999shah and @willapat. Change all three together.

## Conventions

- Base path `/v1`, JSON bodies, `snake_case` keys
- Scores and confidences are decimals from 0 to 1
- Money is an integer plus an ISO 4217 currency code (`KES`, `USD`, `MXN`, `INR`, `EUR`)
- Error shape on every endpoint:

```json
{"error": {"code": "string", "message": "string", "details": {}}}
```

## Enums

The demo MVP focuses on Kenya, the USA and Mexico (`KE`, `US`, `MX`) in English, Spanish and Swahili (`en`, `es`, `sw`). India, Germany, Hindi and German stay valid for later.

| Name | Values |
|---|---|
| country | `KE`, `US`, `MX`, `IN`, `DE` |
| language | `en`, `es`, `sw`, `hi`, `de` |
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

**proficiency = 0.4 × confidence + 0.6 × quiz_score**

## LearnerNeeds

The data teammate's code writes it; Faraz's API reads it to customize lessons. It says what the learner's group struggles with, from the Findex data. Rates are decimals from 0 to 1.

```json
{
  "user_id": "u_8f3c2a91",
  "country": "KE",
  "topic_needs": {
    "saving": {
      "indicator": "Saved at a bank in the past year",
      "group_rate": 0.384,
      "benchmark_rate": 0.6,
      "findex_gap": 0.36
    }
  }
}
```

`topic_needs` has one entry per topic. `findex_gap` feeds the path priority formula.

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

## Lesson

`GET /v1/lessons/{lesson_id}` returns a lesson already customized for the learner: only the cards that fit their difficulty, life stage and goal, with Findex facts filled in.

```json
{
  "lesson_id": "saving-safe-saving",
  "topic": "saving",
  "title": "Safe Saving",
  "goal": "Compare where money can be kept and understand protection and growth.",
  "difficulty": 2,
  "cards": [
    {
      "card_id": "protected-quiz",
      "type": "mc_quiz",
      "text": "Where is your money protected if something goes wrong?",
      "options": {"a": "In a licensed bank with deposit insurance", "b": "Under the mattress"},
      "correct_option": "a",
      "voice": {"speak_text": "...", "answer_mode": "say_option", "spoken_options": {"a": "...", "b": "..."}}
    }
  ]
}
```

## Lesson cards

Card types: `concept`, `bridge`, `mc_quiz`, `drag_match`, `compare_chart`, `clause_tap`, `scam_swipe`, `budget_sim`, `takeaway`.

Every card has a **required** `voice` block, so every lesson, including AI-generated bonus lessons, can be played entirely by voice:

```json
"voice": {
  "speak_text": "Full spoken version of the card, including every option with its letter.",
  "answer_mode": "say_option | say_next",
  "spoken_options": {"a": "option text", "b": "option text"},
  "correct_feedback": "Spoken feedback when right (quiz cards only).",
  "incorrect_feedback": "Spoken feedback when wrong, including the explanation (quiz cards only)."
}
```

## Scoring

**priority = 0.4 × findex_gap + 0.4 × (1 − proficiency) + 0.2 × goal_match**

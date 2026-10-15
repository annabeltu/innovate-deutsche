# Onboarding Data Contract

Owner: Data & content (Taran). Status: **draft**. The `/v1/onboarding` request body is not yet defined in [`API_CONTRACTS.md`](API_CONTRACTS.md); this document describes what the app currently produces so the LearnerProfile API can be built against it. See [Open questions](#open-questions).

## What this data is

The onboarding payload is the user's own answers from setup and onboarding: where they live, their language, accessibility preferences, life stage, main goal, how comfortable they feel with money, and how confident they feel in five topics.

**This layer does not infer weaknesses, strengths or priorities.** `"saving": 1` means *the user said* their confidence in saving is very low. Whether that becomes a focus area is decided by the LearnerProfile API (Will) and the path scoring (Faraz), not here.

```
Onboarding screens (frontend)
    ↓  OnboardingState            raw answers, camelCase, null = unanswered
validateOnboarding(...)
    ↓
buildOnboardingPayload(...)
    ↓  OnboardingPayload (JSON)   this document
POST /v1/onboarding (Will)
    ↓  LearnerProfile             proficiency, topic_scores, ... (API_CONTRACTS.md)
Path + Lessons API (Faraz)
```

| Shape | Where | Who owns it |
|---|---|---|
| `OnboardingState` | `app/src/types/onboarding.ts` | Data & content. UI-only, never sent. |
| `OnboardingPayload` | `app/src/types/onboarding.ts`, built by `app/src/onboarding/build-payload.ts` | Data & content. The JSON sent to the API. |
| `LearnerProfile` | `docs/API_CONTRACTS.md` | Will + Faraz. Derived from the payload by Will's API. |

## Payload fields

All fields are required. Keys are `snake_case`, following `API_CONTRACTS.md`.

| Field | Type | Allowed values |
|---|---|---|
| `country` | string | `US`, `MX`, `KE` |
| `language` | string | `en`, `es`, `sw`; must be supported by the chosen country (below) |
| `accessibility.read_aloud` | boolean | |
| `accessibility.simple_mode` | boolean | |
| `accessibility.large_text` | boolean | |
| `life_stage` | string | `student`, `first_job`, `parent`, `retired` |
| `goal` | string | `save_more`, `avoid_debt`, `stay_safe_online`, `handle_emergencies` |
| `comfort` | string | `beginner`, `somewhat_comfortable`, `confident` |
| `confidence.accounts` | integer | 1–5 |
| `confidence.saving` | integer | 1–5 |
| `confidence.borrowing` | integer | 1–5 |
| `confidence.scams` | integer | 1–5 |
| `confidence.budget` | integer | 1–5 |

`voice_mode` and `speech_rate` (in the LearnerProfile `accessibility` block) are not collected during onboarding; the API should apply its own defaults. `savings_habit` is not collected.

### Confidence scale

Each value is the user's self-reported confidence from a 1–5 slider:

| Value | Meaning |
|---|---|
| 1 | Very low |
| 2 | Low |
| 3 | Moderate |
| 4 | Good |
| 5 | High |

The payload sends the **raw 1–5 integer**. `API_CONTRACTS.md` stores confidence as 0–1 in the LearnerProfile; `normalizeConfidence()` in `build-payload.ts` gives the conversion `(score − 1) / 4` (1→0, 2→0.25, 3→0.5, 4→0.75, 5→1) if that should happen on the app side instead.

The topic ids match the `topic` enum in `API_CONTRACTS.md`. What each slider asks:

| Topic | Label | Question |
|---|---|---|
| `accounts` | Bank accounts and payments | Using an account to keep, send and receive money |
| `saving` | Saving | Choosing a safe place to save money |
| `borrowing` | Borrowing and credit | Understanding the total cost of a loan |
| `scams` | Spotting scams | Recognizing a money scam |
| `budget` | Budgeting and emergencies | Planning a monthly budget and saving for emergencies |

## Countries and languages

| Country | Code | Currency | Symbol | Languages (first is default) |
|---|---|---|---|---|
| United States | `US` | `USD` | `$` | `en`, `es` |
| Mexico | `MX` | `MXN` | `$` | `es`, `en` |
| Kenya | `KE` | `KES` | `KSh` | `en`, `sw` |

To add or change a country, edit `app/src/onboarding/countries.ts` and the `COUNTRY_CODES` list in `app/src/types/onboarding.ts`.

## Example

```json
{
  "country": "MX",
  "language": "es",
  "accessibility": { "read_aloud": false, "simple_mode": true, "large_text": false },
  "life_stage": "student",
  "goal": "avoid_debt",
  "comfort": "beginner",
  "confidence": { "accounts": 3, "saving": 1, "borrowing": 1, "scams": 4, "budget": 2 }
}
```

Fixtures for testing: [`data/fixtures/onboarding/`](../data/fixtures/onboarding/) has `US.json` (first job, English, save more), `MX.json` (student, Spanish, avoid debt) and `KE.json` (parent, Kiswahili, handle emergencies). They contain user answers only, no Findex data.

## Frontend usage

Screens render options from the config and keep answers in an `OnboardingState`:

```ts
import { COUNTRIES, getLanguagesForCountry } from '@/src/onboarding/countries';
import { GOAL_OPTIONS, CONFIDENCE_QUESTIONS } from '@/src/onboarding/options';
import { buildOnboardingPayload, createInitialOnboardingState } from '@/src/onboarding/build-payload';

const state = createInitialOnboardingState();

// e.g. in a goal picker: GOAL_OPTIONS.map((goal) => t(goal.labelKey))
state.country = 'MX';
state.language = getLanguagesForCountry('MX')[0].code; // 'es'
state.goal = 'avoid_debt';
// ...one slider per CONFIDENCE_QUESTIONS entry, from question.min to question.max
state.confidence.saving = 1;

const result = buildOnboardingPayload(state);
if (result.ok) {
  // result.payload is plain JSON: send it with the API client
  JSON.stringify(result.payload);
} else {
  // result.errors: [{ field: 'comfort', message: '...' }, ...]
}
```

Labels and helper text are i18n keys (`labelKey`, `helperKey`, `questionKey`). The text is in `app/src/i18n/locales/{en,es,sw}.json` under `onboarding.*`. English is the source; **the Spanish and Kiswahili text is a draft and needs review by a fluent speaker before production.** `icon` values are identifiers for the UI to map to its own icon set.

## Backend usage

Treat the payload as the user's raw answers. Validate it with a Pydantic model that mirrors the table above, then derive the LearnerProfile from it (for example, normalising confidence to 0–1 and combining it with the quiz). Use the fixtures in `data/fixtures/onboarding/` in tests.

## Open questions

To confirm with Will before this becomes part of `API_CONTRACTS.md`:

1. **Request shape.** Is the payload above the `/v1/onboarding` request body, or does it need extra fields (for example `user_id`)?
2. **Confidence.** Should the request carry raw 1–5 values (current) or normalised 0–1 values?
3. **Comfort.** The LearnerProfile shows `"comfort": 1` with no range. Should the request send the string id (current), or an integer, and if so which number does each level map to?

Only `buildOnboardingPayload` needs to change once these are answered.

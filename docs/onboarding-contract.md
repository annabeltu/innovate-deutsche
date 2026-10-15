# Onboarding Data Contract

Status: aligned with the implemented [API contract](API_CONTRACTS.md).
The API's Pydantic `OnboardingRequest` and `app/src/types/api.ts` are the wire
contract. `OnboardingPayload` aliases that shared TypeScript request.

## UI state and outgoing payload

`createInitialOnboardingState()` produces unanswered UI fields (`null`) and
accessibility preferences set to false. Screens may render labels and helper
text from `onboarding/options.ts` and country/language choices from
`onboarding/countries.ts`. Translations live in `i18n/locales/{en,es,sw}.json`
and are registered with the existing i18next instance.

`buildOnboardingPayload()` validates that every required UI field is answered,
then converts the UI scales before sending:

| UI value | API value |
|---|---|
| Confidence 1, 2, 3, 4, 5 | 0, 0.25, 0.5, 0.75, 1 |
| Comfort `beginner` | 1 |
| Comfort `somewhat_comfortable` | 2 |
| Comfort `confident` | 3 |
| `readAloud` | `accessibility.read_aloud` and `voice_mode` |
| `simpleMode` / `largerText` | `simple_mode` / `large_text` |

The app does not ask about savings habits yet, so the payload includes
`savings_habit: "none"`. Country, language, life stage and goal retain their
contract ids. US/MX support English and Spanish; KE supports English and
Swahili. Invalid pairs are rejected before submitting.

The existing persisted-screen adapter (`toOnboardingRequest`) accepts its
normalized 0–1 confidence values directly; it does not normalize them twice.
Both adapters produce the same API shape. Stage and goal pickers use the
shared option ids, and country language pickers use the shared configuration.

## Example request

```json
{
  "country": "MX",
  "language": "es",
  "accessibility": {
    "read_aloud": false,
    "voice_mode": false,
    "simple_mode": true,
    "large_text": false
  },
  "life_stage": "student",
  "goal": "avoid_debt",
  "comfort": 1,
  "savings_habit": "none",
  "confidence": { "accounts": 0.5, "saving": 0, "borrowing": 0, "scams": 0.75, "budget": 0.25 }
}
```

The fixtures in `data/fixtures/onboarding/` use this API-ready shape and are
validated against the Pydantic schema in tests. They contain only synthetic
answers, with no Findex statistics or inferred proficiency.

## Connected flow

`POST /v1/onboarding` creates a quiz session. Submitting it grades the answers
on the server and retains that learner id for the preview and lessons. The
direct-path option explicitly skips the quiz. `GET /v1/path/{user_id}` scores
the stored profile and Findex needs. Language changes patch the existing
profile; they do not recreate it or discard earned progress.

Spanish and Swahili copy should receive fluent-speaker review before release.

# Kompass

Kompass is a gamified mobile app, with a lesson roadmap, coins, streaks and hearts, that teaches money skills tailored to the user's country: India, Kenya or Germany. Five pre-written lessons are personalized with the learner's profile and World Bank Global Findex data, and an LLM adapts the wording. Users can "Ask Kiko" by voice to get a brand-new lesson added to their roadmap, and the whole app, including that flow, works in a full voice mode for blind and low-vision users.

## Team

| Name | GitHub | Owns | Branch |
|---|---|---|---|
| Faraz | @faraz999shah | Path + Lessons API, LLM layer | `feature/faraz-path-lessons` |
| Will | @willapat | LearnerProfile API (onboarding, baseline quiz, profile) | `feature/will-learner-profile` |
| Frontend | @frontend-placeholder | Expo React Native app | `feature/frontend-app` |
| Data & content | @data-placeholder | Findex data, country packs, lesson templates | `feature/data-content` |
| Voice & integration | @voice-placeholder | Speech-to-text, voice intents, text-to-speech, deployment, CI | `feature/voice-integration` |

File-level ownership is in [`CODEOWNERS`](CODEOWNERS). Architecture is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and the agreed API reference is in [`docs/API_CONTRACTS.md`](docs/API_CONTRACTS.md).

## Repo layout

```
api/    FastAPI backend (Python 3.11)
app/    Expo React Native app (TypeScript)
data/   Findex data, country packs, lesson templates, question bank, fixtures
docs/   API contracts and architecture
```

## Onboarding data

Onboarding answers become one JSON payload for the LearnerProfile API. Full details are in [`docs/onboarding-contract.md`](docs/onboarding-contract.md).

| What | Where |
|---|---|
| Types (`OnboardingState`, `OnboardingPayload`) | `app/src/types/onboarding.ts` |
| Answer options and confidence questions | `app/src/onboarding/options.ts` |
| Countries and languages | `app/src/onboarding/countries.ts` |
| Validation and the JSON builder | `app/src/onboarding/build-payload.ts` (`buildOnboardingPayload(state)`) |
| Onboarding text (en, es, sw) | `app/src/i18n/locales/` |
| Mock payloads (US, MX, KE) | `data/fixtures/onboarding/` |

## Running the API

Requires Python 3.11.

```bash
cd api && pip install -r requirements.txt && uvicorn app.main:app --reload
```

Check it at <http://localhost:8000/health> (returns `{"status": "ok"}`). The interactive API docs are at <http://localhost:8000/docs>. Run the tests with `pytest` from `api/`.

Copy `.env.example` to `.env` and fill in keys when you need them.

## Running the app

```bash
cd app && npx expo start
```

Then press `i` for the iOS simulator, `a` for Android, or scan the QR code with Expo Go.

## Branch strategy

- Work on your feature branch, then merge into `dev` through a pull request.
- `dev` is merged into `main` before the demo.
- Never commit straight to `main`.

### Shared contract rule

Changes to `api/app/schemas/shared.py`, `app/src/types/api.ts` or `docs/API_CONTRACTS.md` need approval from **both** @faraz999shah and @willapat. Keep the three files in sync in the same PR.

## Accessibility and voice mode

Kompass must be fully usable by blind and low-vision users. **Every screen and every lesson must work by voice alone**, with no need to see the screen:

- Voice mode turns on automatically when VoiceOver or TalkBack is detected, and it can be switched on or off from any screen.
- Every lesson card, including AI-generated bonus lessons, has a required `voice` block (see `docs/API_CONTRACTS.md`) that teaches the same thing as the visual card.
- Spoken text uses short sentences, reads every option with its letter, says how to answer, and never says "tap", "swipe" or "see".
- Users can always say "repeat", "next", "back" or "help", and there are no time limits in voice mode.
- Every interactive element has an accessibility label, role and hint. Text contrast is at least 4.5:1 and tap targets are at least 44 points.

The PR template includes an accessibility checklist; fill it in on every PR.

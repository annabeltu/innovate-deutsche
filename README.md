# Kompass

Kompass is a gamified mobile app, with a lesson roadmap, coins, streaks and hearts, that teaches money skills tailored to the user's country: the United States, Mexico or Kenya. Five pre-written lessons are personalized with the learner's profile and World Bank Global Findex data, and an LLM adapts the wording. Users can "Ask Kiko" by voice to get a brand-new lesson added to their roadmap, and the whole app, including that flow, works in a full voice mode for blind and low-vision users.

## Team

| Name | GitHub | Owns | Branch |
|---|---|---|---|
| Faraz | @faraz999shah | Path + Lessons API, LLM layer | `feature/faraz-path-lessons` |
| Will | @willapat | LearnerProfile API (onboarding, baseline quiz, profile) | `feature/will-learner-profile` |
| Frontend | @annabeltu | Expo React Native app | `feature/annabel-frontend-app` |
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

The app uses Expo SDK 54. Install its dependencies once from the repository root:

```bash
cd app
npm ci
```

### macOS: test in Xcode Device Hub

Use **Device Hub** to display the simulated iPhone and **Expo Go** inside it to run Kompass. You do not need to open the repository in Xcode.

1. **Finish Xcode setup.** Open Xcode and complete its installation prompts. Under **Xcode → Settings → Locations**, select Xcode in the **Command Line Tools** dropdown. Under **Components/Platforms**, install an iOS Simulator runtime if needed. If the tools still point to the standalone Command Line Tools, run:

   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   xcrun simctl list devices available
   ```

2. **Open Device Hub** from a terminal:

   ```bash
   open -a DeviceHub
   ```

   Device Hub is included with Xcode 27. Earlier Xcode versions use the Simulator app.

3. **Start an iPhone simulator.** Select **iPhone 17 Pro** in Device Hub. If it is not running, open a new terminal tab and run:

   ```bash
   xcrun simctl boot "iPhone 17 Pro"
   ```

   Use a device name from `xcrun simctl list devices available` if yours differs. Skip the boot command if the device is already booted.

4. **Install Expo Go if needed.** This only needs to be done once per simulator. In a separate terminal tab:

   ```bash
   cd /tmp
   npx --yes expo-go download ios 54
   ```

   The command prints the downloaded `.app` path. Install that path on the booted simulator, for example:

   ```bash
   xcrun simctl install booted /private/tmp/Expo-Go-54.0.7.tar.app
   ```

   Substitute the actual path printed by the download command if it differs. Keep only the simulator you want to test booted when using `booted` in these commands.

5. **Start Kompass.** In a terminal, navigate to this repository's `app/` folder and run:

   ```bash
   npx expo start --go --localhost
   ```

   Leave this terminal running. If Expo is already running, use that terminal instead. To clear the bundler cache when troubleshooting, add `--clear`.

6. **Open Kompass in the simulator.** In a separate terminal tab, run:

   ```bash
   xcrun simctl openurl booted exp://127.0.0.1:8081
   ```

   Accept any prompt inside the simulated iPhone to open Expo Go. If Metro reports a port other than `8081`, use that port in the URL. Use this command instead of Expo's **i** shortcut with Xcode 27: SDK 54's CLI still expects the older Simulator app.

7. **Test the UI.** Click language and country cards. Select Mexico or Kenya to check the background. Click and drag upward to scroll. Click **Get started** to move to the next onboarding screen. To compare phone sizes, boot another installed device, install Expo Go on it, and open the same Metro URL.

8. **Refresh changes.** Code changes should refresh automatically. To reload manually, focus the terminal running Expo and press **r**.

9. **Stop the server.** Press **Ctrl+C** in the Expo terminal when finished.

This localhost workflow runs entirely on your Mac and does not require your physical iPhone to connect over Wi-Fi or an ngrok tunnel.

### Physical phone or Android

From `app/`, run `npx expo start --go` and scan the QR code with a compatible Expo Go app on the same network. Press **a** to open an installed Android emulator. A physical phone cannot use the simulator's `127.0.0.1` URL.

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

### Confidence check and baseline quiz

The third setup screen saves five confidence sliders and uses the selected country scenery. “Build my path” opens the baseline quiz. After successful submission, the app opens a five-lesson preview ordered by slider confidence, lowest first. Each explanation reflects a low, medium, or high confidence rating. The preview uses self-reported confidence, not a World Bank data calculation. Its primary action opens the scenic roadmap, which keeps the same confidence order. The first unfinished lesson is current; later unfinished lessons are locked. Completed lessons stay available. New learners begin with no completed lessons. Country scenery, counters, and bonus lessons come from persisted learner state. The baseline quiz at `/quiz` is served from `data/question_bank/questions.json` by the API. Set `EXPO_PUBLIC_API_URL` in the app environment (use your computer’s LAN address on a physical phone). Start the API before starting the quiz. The server keeps answer keys and combines confidence with quiz results when saving proficiency.

The baseline uses one easy and one hard question per topic, as required by the API contract. Confidence does not change baseline difficulty. The language selector offers English, Español, and Kiswahili to match the bank. Kiswahili quizzes require Kenya; English and Spanish quizzes support the United States and Mexico. Current setup defaults the goal to saving more and savings habit to none until those choices have controls.

### Roadmap challenges

Budgeting and scam lessons use interactive reference-based screens. Budgeting uses whole-unit practice amounts in USD, MXN, or KES: fund the repair, retain the stated category minimums, and allocate the full income to pass. Scam practice offers retry feedback without losing hearts. A correct challenge awards 10 coins once per topic, saves completion, and opens a success sheet; continuing returns to the roadmap and unlocks the next unfinished topic. Replay never awards duplicate coins. Copy and read-aloud text are available in English, Spanish, and Swahili.

Screens render edge to edge. Safe-area spacing applies to controls and scroll content instead of wrapping the whole app in a framed viewport. Feedback uses transparent Kiko assets; generation prompts are recorded in `app/assets/challenges/README.md`.

### Shop, Ask Kiko and extra lessons

The shop uses a fixed catalog: a collection streak freeze (50 coins), an extra heart (100), three wearable Kiko outfits (150 each), and a pre-written money-transfer lesson (200). Purchases validate the catalog price and balance, cannot charge twice, and persist. Freeze ownership is currently a collection item; automatic missed-day protection is not implemented. Purchased outfits appear on Kiko in Shop, Ask and the roadmap.

Ask Kiko supports typed questions, recording controls, read-aloud and a clearly labeled local example conversation. The example and follow-ups use curated translations; unrelated questions do not receive a fake tailored answer. `/v1/ask` and `/v1/voice/transcribe` remain backend placeholders: configured requests show an error if those endpoints are unavailable. The example button works independently of those services. It adds the same pre-written transfer lesson as the shop, without a duplicate charge.

An added lesson creates a persisted notice above the roadmap navigation. Dismissing the notice keeps the lesson. The bonus node opens a translated lesson and awards completion coins once. All new copy is available in English, Spanish and Swahili. Microphone permission is requested only when recording starts, and screen narration pauses while recording.

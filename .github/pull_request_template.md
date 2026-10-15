## What does this PR do?

<!-- One or two sentences. Link the issue or task if there is one. -->

## Type of change

- [ ] Feature
- [ ] Fix
- [ ] Docs / chore
- [ ] Shared contract change (`shared.py`, `api.ts`, `API_CONTRACTS.md`): needs approval from **both** @faraz999shah and @willapat

## How was it tested?

- [ ] `pytest` passes in `/api`
- [ ] App starts with `npx expo start` and the changed screen works

## Accessibility checklist

- [ ] Every interactive element has `accessibilityLabel`, `accessibilityRole` and `accessibilityHint`
- [ ] Every new screen, card or response has voice text (`speak_text` / `voice` block) and works by voice alone
- [ ] Voice text never says "tap", "swipe", "see" or "the chart above"; it describes instead
- [ ] Every spoken question reads all options with their letter and says how to answer
- [ ] No time limits on any interaction
- [ ] Text contrast is at least 4.5:1 and tap targets are at least 44 points
- [ ] Tested with VoiceOver or TalkBack (or explained why not)

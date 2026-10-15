# Kompass frontend

Run `npm ci` then `npm start` from `app/`. Open with an Expo Go version supporting SDK 54, or run `npm run web`.

Routes: `/`, `/onboarding`, `/confidence`, `/path`, `/roadmap`, `/lesson?id=budget`, `/lesson?id=scams`, `/success`, `/ask`, `/practice`, `/leagues`, `/shop`.

The frontend runs as a local demo. Onboarding, preferences, lesson completion, coins, purchases and bonus lessons persist in AsyncStorage. The two initial completed lessons and the 240-coin wallet match the reference screenshots. Lessons award 10 coins once per lesson. Community leagues are a labeled coming-soon screen.

Ask Kiko records with expo-audio and supports typed questions. Without EXPO_PUBLIC_API_URL it offers an explicitly labeled sample answer. Set the variable to the API origin to call `/v1/ask` and `/v1/voice/transcribe`. These adapters expect `{answer: string}` and `{text: string}` respectively; confirm final payloads with the voice/backend owner. Bonus lessons currently use local starter content. Profile, path and lesson APIs are not yet connected.

Navigation labels and onboarding headings support English, Hindi, Swahili and German via i18next; lesson content and some controls still use English. Read-aloud uses expo-speech to narrate screen text, with a repeat control. The app honors reduced motion and offers larger text and simple mode. Full voice intent navigation still requires the voice API integration.

Validation: `npm run typecheck`, `npm run lint`, `npx expo export --platform web`.

For iPhone Expo Go, use the SDK 54-compatible App Store app. After changing dependencies, stop the old Metro process and run `npx expo start --go --tunnel --clear` from `app/`, then scan the new QR code. The native Expo Go runtime must match the project SDK.

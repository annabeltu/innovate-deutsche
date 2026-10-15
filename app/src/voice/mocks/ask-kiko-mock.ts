import type { Language } from "@/src/types/api";
import type { AskKikoApi, AskKikoReply } from "@/src/voice/ask-kiko-flow";

// MOCK ONLY. Stands in for Faraz's POST /v1/ask and POST /v1/bonus-lessons until they
// exist, so the Ask Kiko screen can be built and demoed offline. It never calls the
// network and must not be used when the real endpoints are available. Replace with a
// real adapter in src/api/ once the contract in docs/VOICE_API.md is agreed.

export const MOCK_OFFER_REF = "mock_offer_emergency_savings";

const MOCK_REPLIES: Record<Language, AskKikoReply> = {
  en: {
    spokenAnswer:
      "An emergency fund is money you keep only for surprises, like a doctor visit. Start small, even a little each week.",
    lessonOffer: {
      confirmPrompt:
        "Would you like a short lesson on building an emergency fund? Say yes to add it, or no to skip it.",
      offerRef: MOCK_OFFER_REF,
    },
  },
  es: {
    spokenAnswer:
      "Un fondo de emergencia es dinero que guardas solo para imprevistos, como una visita al médico. Empieza con poco, aunque sea un poco cada semana.",
    lessonOffer: {
      confirmPrompt:
        "¿Quieres una lección corta sobre cómo crear un fondo de emergencia? Di sí para agregarla, o no para omitirla.",
      offerRef: MOCK_OFFER_REF,
    },
  },
  sw: {
    spokenAnswer:
      "Akiba ya dharura ni pesa unayoweka kwa ajili ya mambo ya ghafla tu, kama kumwona daktari. Anza kidogo, hata kiasi kidogo kila wiki.",
    lessonOffer: {
      confirmPrompt:
        "Je, ungependa somo fupi kuhusu kuweka akiba ya dharura? Sema ndiyo kuliongeza, au hapana kuliruka.",
      offerRef: MOCK_OFFER_REF,
    },
  },
};

const MOCK_ANNOUNCEMENTS: Record<Language, string> = {
  en: "Done. Your new lesson on emergency funds is now on your path.",
  es: "Listo. Tu nueva lección sobre fondos de emergencia ya está en tu camino.",
  sw: "Tayari. Somo lako jipya kuhusu akiba ya dharura sasa liko kwenye njia yako.",
};

/** A fake Ask Kiko backend for one language. Records added offers so tests can check them. */
export function createMockAskKikoApi(
  language: Language,
): AskKikoApi & { addedOffers: string[] } {
  const addedOffers: string[] = [];
  return {
    addedOffers,
    ask: async () => MOCK_REPLIES[language],
    addBonusLesson: async (offerRef) => {
      addedOffers.push(offerRef);
      return MOCK_ANNOUNCEMENTS[language];
    },
  };
}

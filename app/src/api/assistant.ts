import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "./client";
import { transcribeRecording } from "./voice";
import { demoKikoAnswer } from "../mocks/ask-demo";
import type { Country, Language } from "../state/useApp";

type AskInput = {
  question: string;
  country: Country;
  language: Language;
  demo: boolean;
};

/** Request a checked answer or the explicitly selected local sample conversation. */
export function useKikoAnswer() {
  return useMutation({
    mutationFn: async (input: AskInput) => {
      if (input.demo) return demoKikoAnswer(input.question, input.language);
      const data = await apiRequest<unknown>("/v1/ask", {
        method: "POST",
        body: {
          question: input.question,
          country: input.country,
          language: input.language,
        },
      });
      if (
        !data ||
        typeof data !== "object" ||
        !("answer" in data) ||
        typeof data.answer !== "string"
      )
        throw new Error("askScreen.connectionError");
      return { answer: data.answer, canAddLesson: false, sample: false };
    },
  });
}

/** Upload audio through the shared voice client; reject empty transcripts. */
export function useKikoTranscription() {
  return useMutation({
    mutationFn: async ({
      uri,
      language,
    }: {
      uri: string;
      language: Language;
    }) => {
      const { text } = await transcribeRecording(uri, language).catch(() => {
        throw new Error("askScreen.voiceUnavailable");
      });
      if (!text.trim()) throw new Error("askScreen.voiceUnavailable");
      return text;
    },
  });
}

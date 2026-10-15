import { useMutation } from "@tanstack/react-query";
import { Platform } from "react-native";
import { onboardingClient, postJson } from "./onboarding";
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
  return useMutation(
    {
      mutationFn: async (input: AskInput) => {
        if (input.demo) return demoKikoAnswer(input.question, input.language);
        const data = await postJson<unknown>("/ask", {
          question: input.question,
          country: input.country,
          language: input.language,
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
    },
    onboardingClient,
  );
}

/** Upload audio with a language hint; validate the transcript at the network boundary. */
export function useKikoTranscription() {
  return useMutation(
    {
      mutationFn: async ({
        uri,
        language,
      }: {
        uri: string;
        language: Language;
      }) => {
        const base = process.env.EXPO_PUBLIC_API_URL;
        if (!base) throw new Error("askScreen.voiceUnavailable");
        const body = new FormData();
        if (Platform.OS === "web") {
          const blob = await (await fetch(uri)).blob();
          body.append("file", blob, "question.webm");
        } else
          body.append("file", {
            uri,
            name: "question.m4a",
            type: "audio/mp4",
          } as unknown as Blob);
        body.append("language", language);
        const response = await fetch(
          `${base.replace(/\/$/, "")}/v1/voice/transcribe`,
          { method: "POST", body },
        );
        if (!response.ok) throw new Error("askScreen.voiceUnavailable");
        const data: unknown = await response.json();
        if (
          !data ||
          typeof data !== "object" ||
          !("text" in data) ||
          typeof data.text !== "string" ||
          !data.text.trim()
        )
          throw new Error("askScreen.voiceUnavailable");
        return data.text;
      },
    },
    onboardingClient,
  );
}

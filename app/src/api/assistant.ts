import { useMutation } from "@tanstack/react-query";
import { transcribeRecording } from "./voice";
import type { Language } from "../state/useApp";

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

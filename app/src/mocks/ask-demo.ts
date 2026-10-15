import i18n from "../i18n";
import type { Language } from "../state/useApp";

/** Curated sample conversation; unrelated questions never receive a fake tailored answer. */
export function demoKikoAnswer(question: string, language: Language) {
  const t = i18n.getFixedT(language);
  const normalized = question.trim().toLocaleLowerCase(language);
  const choices = ["example", "fees", "time", "safety"] as const;
  const match = choices.find(
    (key) =>
      t(`askScreen.${key}Question`).toLocaleLowerCase(language) === normalized,
  );
  return {
    answer: t(match ? `askScreen.${match}Answer` : "askScreen.previewOnly"),
    canAddLesson: !!match,
    sample: true,
  };
}

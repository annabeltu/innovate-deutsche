import { experienceCopy } from "../../i18n/experience";
import { demoKikoAnswer } from "../../mocks/ask-demo";
import i18n from "../../i18n";

function keys(value: object, prefix = ""): string[] {
  return Object.entries(value)
    .flatMap(([key, entry]) =>
      typeof entry === "object" && entry !== null
        ? keys(entry, `${prefix}${key}.`)
        : [`${prefix}${key}`],
    )
    .sort();
}
it.each(["es", "sw"] as const)(
  "has every quiz, shop, assistant and notification key in %s",
  (language) => {
    expect(keys(experienceCopy[language])).toEqual(keys(experienceCopy.en));
  },
);
it.each(["en", "es", "sw"] as const)(
  "only offers the curated transfer lesson for matching sample questions in %s",
  (language) => {
    const question = i18n.getFixedT(language)("askScreen.exampleQuestion");
    expect(demoKikoAnswer(question, language).canAddLesson).toBe(true);
    expect(demoKikoAnswer("unrelated question", language).canAddLesson).toBe(
      false,
    );
  },
);

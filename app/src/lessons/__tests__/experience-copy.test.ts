import { experienceCopy } from "../../i18n/experience";

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

import i18n from "..";

const LANGUAGES = ["es", "sw"];

describe("locales", () => {
  const englishKeys = Object.keys(
    i18n.getResourceBundle("en", "translation"),
  ).sort();

  it.each(LANGUAGES)("%s has exactly the same keys as English", (language) => {
    const keys = Object.keys(i18n.getResourceBundle(language, "translation"));
    expect(keys.sort()).toEqual(englishKeys);
  });
});

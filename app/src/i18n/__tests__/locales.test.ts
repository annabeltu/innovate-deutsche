import i18n from "..";
import en from "../locales/en.json";
import es from "../locales/es.json";
import sw from "../locales/sw.json";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") {
    expect(value.trim()).not.toBe("");
    return [prefix];
  }
  if (!value || typeof value !== "object")
    throw new Error(`Invalid translation at ${prefix}`);
  return Object.entries(value).flatMap(([key, nested]) =>
    leafKeys(nested, prefix ? `${prefix}.${key}` : key),
  );
}

it.each([
  ["es", es],
  ["sw", sw],
] as const)(
  "%s explicitly translates every nested English key",
  (_language, locale) => {
    expect(leafKeys(locale).sort()).toEqual(leafKeys(en).sort());
  },
);

it("does not silently fall back to English for missing translated text", () => {
  expect(i18n.options.fallbackLng).toBe(false);
});

it("keeps spoken voice copy free of sight and touch words", () => {
  const voiceText = JSON.stringify(en.voice).toLowerCase();
  expect(voiceText).not.toMatch(/\b(tap|swipe|see)\b/);
});

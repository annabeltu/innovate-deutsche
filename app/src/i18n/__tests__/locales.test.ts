import i18n from "..";

type Tree = { [key: string]: string | Tree };

function flatKeys(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string"
      ? [`${prefix}${key}`]
      : flatKeys(value, `${prefix}${key}.`),
  );
}

const bundle = (language: string) =>
  i18n.getResourceBundle(language, "translation") as Tree;

it.each(["es", "sw"])(
  "has every English key, nested ones included, in %s",
  (language) => {
    expect(flatKeys(bundle(language)).sort()).toEqual(
      flatKeys(bundle("en")).sort(),
    );
  },
);

it.each(["en", "es", "sw"])("has no empty strings in %s", (language) => {
  const empty = flatKeys(bundle(language)).filter(
    (key) => i18n.getFixedT(language)(key).trim() === "",
  );
  expect(empty).toEqual([]);
});

it("keeps spoken voice copy free of sight and touch words", () => {
  const voiceText = JSON.stringify(bundle("en").voice).toLowerCase();
  expect(voiceText).not.toMatch(/\b(tap|swipe|see)\b/);
});

import { personalizePath } from "../personalized-path";
import { pathPreviewCopy } from "../../i18n/path-preview";

it("starts with the least confident topic and includes all five lessons", () => {
  expect(
    personalizePath([0.75, 0.5, 1, 0, 0.25]).map((lesson) => lesson.topic),
  ).toEqual(["scams", "budget", "saving", "accounts", "borrowing"]);
});
it("adjusts the wording band for each slider confidence", () => {
  expect(
    personalizePath([0, 0.25, 0.5, 0.75, 1]).map((lesson) => lesson.band),
  ).toEqual(["low", "low", "medium", "high", "high"]);
});
it("keeps tied topics stable and handles missing ratings", () => {
  expect(personalizePath([]).map((lesson) => lesson.topic)).toEqual([
    "accounts",
    "saving",
    "borrowing",
    "scams",
    "budget",
  ]);
});
it.each(["es", "sw"] as const)(
  "has matching preview translation keys for %s",
  (language) => {
    expect(Object.keys(pathPreviewCopy[language]).sort()).toEqual(
      Object.keys(pathPreviewCopy.en).sort(),
    );
    expect(Object.keys(pathPreviewCopy[language].details).sort()).toEqual(
      Object.keys(pathPreviewCopy.en.details).sort(),
    );
  },
);

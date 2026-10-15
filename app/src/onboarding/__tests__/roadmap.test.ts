import { roadmapCopy } from "../../i18n/roadmap";
import { buildRoadmap } from "../roadmap";
import { personalizePath } from "../personalized-path";

it("matches the confidence preview and unlocks only the first lesson", () => {
  const confidence = [0.75, 0.5, 1, 0, 0.25];
  const path = buildRoadmap(confidence, []);
  expect(path.map((lesson) => lesson.topic)).toEqual(
    personalizePath(confidence).map((lesson) => lesson.topic),
  );
  expect(path.map((lesson) => lesson.status)).toEqual([
    "current",
    "locked",
    "locked",
    "locked",
    "locked",
  ]);
});
it("unlocks the next recommendation and preserves completed lessons", () => {
  expect(
    buildRoadmap([0.75, 0.5, 1, 0, 0.25], ["scams", "saving"]).map(
      (lesson) => lesson.status,
    ),
  ).toEqual(["completed", "current", "completed", "locked", "locked"]);
});
it("shows the completed unit without locked lessons", () => {
  expect(
    buildRoadmap(
      [],
      ["accounts", "saving", "borrowing", "scams", "budget"],
    ).every((lesson) => lesson.status === "completed"),
  ).toBe(true);
});

it.each(["es", "sw"] as const)(
  "has matching roadmap translations for %s",
  (language) => {
    expect(Object.keys(roadmapCopy[language]).sort()).toEqual(
      Object.keys(roadmapCopy.en).sort(),
    );
  },
);

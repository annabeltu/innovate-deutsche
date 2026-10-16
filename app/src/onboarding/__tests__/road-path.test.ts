import { roadPath } from "../road-path";

const endpoints = (path: string) =>
  [...path.matchAll(/(?:M|, )\s*(-?[\d.]+) (-?[\d.]+)(?= C|$)/g)].map(
    ([, x, y]) => ({ x: Number(x), y: Number(y) }),
  );

it("draws nothing until there are two points to join", () => {
  expect(roadPath([])).toBe("");
  expect(roadPath([{ x: 10, y: 10 }])).toBe("");
});

it("passes through every lesson node in order", () => {
  const nodes = [
    { x: 40, y: 0 },
    { x: 120, y: 98 },
    { x: 90, y: 196 },
    { x: 130, y: 294 },
  ];

  expect(endpoints(roadPath(nodes))).toEqual(nodes);
});

it("keeps growing as custom lessons add nodes", () => {
  const core = Array.from({ length: 5 }, (_, index) => ({
    x: 100,
    y: index * 100,
  }));
  const withBonus = [
    ...core,
    ...Array.from({ length: 4 }, (_, index) => ({
      x: 120,
      y: (index + 5) * 100,
    })),
  ];

  const segments = (path: string) => path.split(" C ").length - 1;
  expect(segments(roadPath(withBonus))).toBe(segments(roadPath(core)) + 4);
});

it("leaves a straight run straight", () => {
  const path = roadPath([
    { x: 0, y: 0 },
    { x: 0, y: 100 },
    { x: 0, y: 200 },
  ]);

  expect(path).not.toMatch(/C (?!0 )/);
});

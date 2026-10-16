import { act, renderHook } from "@testing-library/react-native";
import { useRoad } from "../RoadLine";

const MAP_WIDTH = 345;
const ROW_HEIGHT = 98;
const BADGE_SIZE = 76;
const segments = (path: string) => path.split(" C ").length - 1;

async function roadWith(nodeIds: string[]) {
  const hook = await renderHook(() =>
    useRoad(MAP_WIDTH, ROW_HEIGHT, BADGE_SIZE),
  );
  await act(async () => {
    nodeIds.forEach((id, index) =>
      hook.result.current.layout.onNode(id, {
        x: 120,
        y: ROW_HEIGHT * index + ROW_HEIGHT / 2,
      }),
    );
  });
  return hook;
}

const core = ["accounts", "saving", "borrowing", "scams", "budget"];
const custom = ["bonus-0", "bonus-1", "bonus-2", "bonus-3"];

it("draws one road through the core lessons and every custom lesson", async () => {
  const coreOnly = await roadWith(core);
  const withCustom = await roadWith([...core, ...custom]);

  // Entry, one segment per node, and a tail past the last node.
  expect(segments(coreOnly.result.current.path)).toBe(core.length + 1);
  expect(segments(withCustom.result.current.path)).toBe(
    core.length + custom.length + 1,
  );
});

it("takes a custom lesson off the road when it leaves the map", async () => {
  const hook = await roadWith([...core, ...custom]);

  await act(async () => hook.result.current.layout.onNode("bonus-3", null));

  expect(segments(hook.result.current.path)).toBe(core.length + custom.length);
});

it("draws no road before any lesson has been measured", async () => {
  const hook = await roadWith([]);

  expect(hook.result.current.path).toBe("");
});

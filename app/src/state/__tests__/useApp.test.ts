import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import { useApp } from "../useApp";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

describe("new learner progress", () => {
  it("starts without completed lessons or earned rewards", () => {
    const state = useApp.getInitialState();

    expect(state.completed).toEqual([]);
    expect(state.coins).toBe(0);
    expect(state.streak).toBe(0);
    expect(state.onboarded).toBe(false);
  });

  it("awards progress only once when a lesson is completed", () => {
    useApp.setState(useApp.getInitialState());

    useApp.getState().complete("accounts");
    useApp.getState().complete("accounts");

    expect(useApp.getState().completed).toEqual(["accounts"]);
    expect(useApp.getState().coins).toBe(10);
  });
});

it("removes persisted demo progress when upgrading the preview", async () => {
  const migrate = useApp.persist.getOptions().migrate;
  const migrated = await migrate?.(
    {
      completed: ["accounts", "saving"],
      coins: 240,
      streak: 7,
      onboarded: true,
      learnerId: "u_demo",
      learnerKey: "demo",
      bonus: ["Sample"],
      bonusLessonIds: { Sample: "bonus_demo" },
    },
    2,
  );

  expect(migrated).toMatchObject({
    completed: [],
    coins: 0,
    streak: 0,
    onboarded: false,
    learnerId: null,
    learnerKey: null,
    bonus: [],
    bonusLessonIds: {},
  });
});

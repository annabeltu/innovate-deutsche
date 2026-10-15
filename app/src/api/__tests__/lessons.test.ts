import { serverLessonId } from "../lessons";

const state = {
  bonus: ["Insurance basics", "Sending money abroad"],
  bonusLessonIds: { "Insurance basics": "bonus_a5a30110" },
};

describe("serverLessonId", () => {
  it("keeps core lesson ids", () => {
    expect(serverLessonId("saving", state)).toBe("saving");
  });

  it("maps a generated bonus lesson to its server id", () => {
    expect(serverLessonId("bonus-0", state)).toBe("bonus_a5a30110");
  });

  it("returns null for a bonus lesson that only exists on the phone", () => {
    expect(serverLessonId("bonus-1", state)).toBeNull();
    expect(serverLessonId("bonus-7", state)).toBeNull();
  });
});

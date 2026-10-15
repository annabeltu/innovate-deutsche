import { comfortLevel, lessonLanguage, toOnboardingRequest } from "../learner";

const answers = {
  country: "KE" as const,
  language: "sw",
  stage: "Parent",
  goal: "Handle emergencies",
  comfort: 0.5,
  confidence: [0.1, 0.2, 0.3, 0.4, 0.5],
  readAloud: true,
  simple: true,
  large: false,
};

describe("toOnboardingRequest", () => {
  it("maps the onboarding screens' answers to the API's values", () => {
    expect(toOnboardingRequest(answers)).toEqual({
      country: "KE",
      language: "sw",
      accessibility: {
        read_aloud: true,
        voice_mode: true,
        simple_mode: true,
        large_text: false,
      },
      life_stage: "parent",
      goal: "handle_emergencies",
      comfort: 2,
      savings_habit: "none",
      confidence: {
        accounts: 0.1,
        saving: 0.2,
        borrowing: 0.3,
        scams: 0.4,
        budget: 0.5,
      },
    });
  });

  it("falls back to sensible defaults for unknown answers", () => {
    const request = toOnboardingRequest({
      ...answers,
      stage: "Unknown",
      goal: "Unknown",
      confidence: [],
    });

    expect(request.life_stage).toBe("first_job");
    expect(request.goal).toBe("save_more");
    expect(request.confidence.budget).toBe(0.5);
  });
});

describe("lessonLanguage", () => {
  it.each([
    ["KE", "sw", "sw"],
    ["KE", "hi", "en"],
    ["MX", "en", "en"],
    ["MX", "de", "es"],
    ["US", "sw", "en"],
  ] as const)("in %s, app language %s gives %s", (country, app, expected) => {
    expect(lessonLanguage(country, app)).toBe(expected);
  });
});

describe("comfortLevel", () => {
  it.each([
    [0, 1],
    [0.32, 1],
    [0.34, 2],
    [0.66, 2],
    [0.67, 3],
    [1, 3],
  ])("maps slider %d to level %d", (slider, level) => {
    expect(comfortLevel(slider)).toBe(level);
  });
});

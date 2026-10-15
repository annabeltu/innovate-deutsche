import { buildOnboardingRequest, topics } from "../request";
import en from "../../i18n/locales/en.json";
import es from "../../i18n/locales/es.json";
import sw from "../../i18n/locales/sw.json";
const confidenceCopy = { en, es, sw };
const state = {
  country: "KE" as const,
  language: "sw",
  stage: "Parent",
  confidence: [0, 0.2, 0.5, 0.8, 1],
  comfort: 0.6,
  readAloud: true,
  simple: false,
  large: true,
};

describe("onboarding request", () => {
  it("preserves each slider value and country for server personalization", () => {
    const request = buildOnboardingRequest(state);
    expect(topics.map((topic) => request.confidence[topic])).toEqual(
      state.confidence,
    );
    expect(request.country).toBe("KE");
    expect(request.language).toBe("sw");
    expect(request.life_stage).toBe("parent");
    expect(request.accessibility?.voice_mode).toBe(true);
  });
  it.each(["hi", "de"])(
    "rejects unsupported %s rather than silently changing language",
    (language) => {
      expect(() => buildOnboardingRequest({ ...state, language })).toThrow(
        "unsupportedLanguage",
      );
    },
  );
  it("rejects Swahili outside Kenya", () => {
    expect(() => buildOnboardingRequest({ ...state, country: "US" })).toThrow(
      "unsupportedLanguage",
    );
  });
  it.each(Object.keys(confidenceCopy) as (keyof typeof confidenceCopy)[])(
    "has the same translated keys for %s",
    (language) => {
      expect(Object.keys(confidenceCopy[language]).sort()).toEqual(
        Object.keys(confidenceCopy.en).sort(),
      );
      expect(
        Object.keys(confidenceCopy[language].confidenceTopics).sort(),
      ).toEqual([...topics].sort());
    },
  );
});

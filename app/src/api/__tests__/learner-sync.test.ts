import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import { ensureLearner, toOnboardingRequest } from "../learner";
import { apiRequest } from "../client";
import { useApp } from "../../state/useApp";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);
jest.mock("../client", () => ({ apiRequest: jest.fn() }));
const request = jest.mocked(apiRequest);

beforeEach(() => {
  jest.clearAllMocks();
  useApp.setState({
    ...useApp.getInitialState(),
    country: "KE",
    language: "en",
  });
  useApp.setState({
    learnerId: "u_existing",
    learnerKey: JSON.stringify(toOnboardingRequest(useApp.getState())),
  });
  request.mockResolvedValue({});
});

it("changes language on the same learner without new onboarding", async () => {
  useApp.setState({ language: "sw", completed: ["saving"], coins: 10 });

  expect(await ensureLearner()).toBe("u_existing");

  expect(request).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledWith("/v1/profile/u_existing/language", {
    method: "PATCH",
    body: { language: "sw" },
  });
  expect(useApp.getState().completed).toEqual(["saving"]);
  expect(useApp.getState().coins).toBe(10);
  await ensureLearner();
  expect(request).toHaveBeenCalledTimes(1);
});

it("keeps the old sync key when the language update fails so it can retry", async () => {
  const previousKey = useApp.getState().learnerKey;
  useApp.setState({ language: "sw" });
  request.mockRejectedValueOnce(new Error("offline"));

  await expect(ensureLearner()).rejects.toThrow("offline");
  expect(useApp.getState().learnerKey).toBe(previousKey);
  expect(await ensureLearner()).toBe("u_existing");
  expect(request).toHaveBeenCalledTimes(2);
});

it("creates a new learner and skips the quiz for the first API lesson", async () => {
  useApp.setState({ learnerId: null, learnerKey: null });
  request.mockResolvedValueOnce({
    user_id: "u_new",
    quiz: { quiz_id: "q_new" },
  });

  expect(await ensureLearner()).toBe("u_new");
  expect(request).toHaveBeenNthCalledWith(1, "/v1/onboarding", {
    method: "POST",
    body: toOnboardingRequest(useApp.getState()),
  });
  expect(request).toHaveBeenNthCalledWith(2, "/v1/quiz/q_new/skip", {
    method: "POST",
    body: { user_id: "u_new" },
  });
});

it("forgets bonus lessons owned by the previous learner when answers change", async () => {
  useApp.setState({
    bonus: ["Save for a bike"],
    bonusLessonIds: { "Save for a bike": "bonus_old" },
    completed: ["saving"],
    country: "MX",
  });
  request.mockResolvedValueOnce({
    user_id: "u_new",
    quiz: { quiz_id: "q_new" },
  });

  expect(await ensureLearner()).toBe("u_new");

  // The old learner's bonus lessons return 404 for the new learner.
  expect(useApp.getState().bonus).toEqual([]);
  expect(useApp.getState().bonusLessonIds).toEqual({});
  expect(useApp.getState().completed).toEqual(["saving"]);
});

it("keeps bonus lessons when only the language changes", async () => {
  useApp.setState({
    bonus: ["Save for a bike"],
    bonusLessonIds: { "Save for a bike": "bonus_kept" },
    language: "sw",
  });

  await ensureLearner();

  expect(useApp.getState().bonusLessonIds).toEqual({
    "Save for a bike": "bonus_kept",
  });
});

import { act, renderHook } from "@testing-library/react-native";
import {
  ROTATION_INTERVAL_MS,
  useRotatingLanguage,
} from "../use-rotating-language";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it("cycles English, Spanish and Swahili while no language is chosen", () => {
  const { result } = renderHook(() => useRotatingLanguage(true));
  const seen = [result.current];
  for (let step = 0; step < 3; step++) {
    act(() => jest.advanceTimersByTime(ROTATION_INTERVAL_MS));
    seen.push(result.current);
  }

  expect(seen).toEqual(["en", "es", "sw", "en"]);
});

it("stops cycling once a language is chosen", () => {
  const { result, rerender } = renderHook(
    ({ active }: { active: boolean }) => useRotatingLanguage(active),
    { initialProps: { active: true } },
  );

  rerender({ active: false });
  act(() => jest.advanceTimersByTime(ROTATION_INTERVAL_MS * 3));

  expect(result.current).toBeNull();
});

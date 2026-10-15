import { act, renderHook } from "@testing-library/react-native";
import {
  ROTATION_INTERVAL_MS,
  useRotatingLanguage,
} from "../use-rotating-language";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it("cycles English, Spanish and Swahili while no language is chosen", async () => {
  const { result } = await renderHook(() => useRotatingLanguage(true));
  const seen = [result.current];
  for (let step = 0; step < 3; step++) {
    await act(async () => jest.advanceTimersByTime(ROTATION_INTERVAL_MS));
    seen.push(result.current);
  }

  expect(seen).toEqual(["en", "es", "sw", "en"]);
});

it("stops cycling once a language is chosen", async () => {
  const { result, rerender } = await renderHook(
    ({ active }: { active: boolean }) => useRotatingLanguage(active),
    { initialProps: { active: true } },
  );

  await rerender({ active: false });
  await act(async () => jest.advanceTimersByTime(ROTATION_INTERVAL_MS * 3));

  expect(result.current).toBeNull();
});

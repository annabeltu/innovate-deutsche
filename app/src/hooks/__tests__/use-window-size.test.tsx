import { renderHook } from "@testing-library/react-native";
import { Platform } from "react-native";
import { useWindowSize } from "../use-window-size";

it("returns the real window size once mounted", async () => {
  const { result } = await renderHook(() => useWindowSize());

  expect(result.current.width).toBeGreaterThan(0);
});

it("starts the web render at the pre-rendered size before mounting", async () => {
  const original = Platform.OS;
  Object.defineProperty(Platform, "OS", { value: "web", configurable: true });
  const sizes: number[] = [];

  await renderHook(() => sizes.push(useWindowSize().width));

  Object.defineProperty(Platform, "OS", {
    value: original,
    configurable: true,
  });
  expect(sizes[0]).toBe(0);
  expect(sizes[sizes.length - 1]).toBeGreaterThan(0);
});

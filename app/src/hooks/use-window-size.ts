import { useEffect, useState } from "react";
import { Platform, useWindowDimensions, type ScaledSize } from "react-native";

const SERVER_RENDER_SIZE = { width: 0, height: 0 };

/**
 * useWindowDimensions that is safe with the web build's static pre-render.
 *
 * The pre-rendered HTML is laid out at width 0, and React keeps those styles
 * when it hydrates. Matching that size on the first browser render, then
 * switching to the real size once mounted, makes React update every size
 * instead of leaving text and icons at 0 px. Native renders the real size
 * immediately.
 */
export function useWindowSize(): ScaledSize {
  const window = useWindowDimensions();
  const [mounted, setMounted] = useState(Platform.OS !== "web");
  useEffect(() => setMounted(true), []);
  return mounted ? window : { ...window, ...SERVER_RENDER_SIZE };
}

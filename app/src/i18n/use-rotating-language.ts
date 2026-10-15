import { useEffect, useState } from "react";
import type { Language } from "../types/api";

export const ROTATING_LANGUAGES: Language[] = ["en", "es", "sw"];
/** Long enough to read a short label, short enough to reach your language quickly. */
export const ROTATION_INTERVAL_MS = 2500;

/**
 * Cycle through every supported language while `active`, so learners who
 * don't read English can still find the setup controls. Returns null when
 * not cycling, meaning "use the chosen language".
 */
export function useRotatingLanguage(active: boolean): Language | null {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % ROTATING_LANGUAGES.length),
      ROTATION_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [active]);
  return active ? ROTATING_LANGUAGES[index] : null;
}

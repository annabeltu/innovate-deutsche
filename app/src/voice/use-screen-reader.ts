import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * True while VoiceOver (iOS) or TalkBack (Android) is on, updating live when it changes.
 * Use it to switch voice mode on automatically; the learner can still turn it off.
 */
export function useScreenReaderEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then((value) => {
      if (mounted) {
        setEnabled(value);
      }
    });
    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setEnabled,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return enabled;
}

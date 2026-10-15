// Kiko, the compass mascot, and KikoNote, the speech bubble Kiko uses to guide,
// cheer and explain loading, empty and error states.
import React, { useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, View } from "react-native";
import Svg, { Circle, Ellipse, Path, Polygon } from "react-native-svg";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Speech from "expo-speech";
import { useTranslation } from "react-i18next";
import { useApp } from "../state/useApp";
import { colors as c } from "../theme/tokens";
import { Txt } from "./Txt";

export type KikoMood = "happy" | "cheer" | "thinking" | "oops";
export type KikoTone = "info" | "success" | "error";

const PULSE_SCALE = 1.07;
const PULSE_MS = 1100;
const TILT_DEGREES = 6;
const TILT_MS = 700;
const BOUNCE_SCALE = 1.15;
const BOUNCE_MS = 140;
const NOTE_KIKO_SIZE = 64;

// Eyes and mouth per mood; the face is the only part that changes.
const FACES: Record<KikoMood, { eyes: React.ReactNode; mouth: string }> = {
  happy: {
    eyes: (
      <>
        <Ellipse cx="51" cy="79" rx="5" ry="8" fill={c.white} />
        <Ellipse cx="89" cy="79" rx="5" ry="8" fill={c.white} />
      </>
    ),
    mouth: "M61 86 Q70 99 80 86",
  },
  cheer: {
    eyes: (
      <Path
        d="M44 81 Q51 71 58 81 M82 81 Q89 71 96 81"
        stroke={c.white}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    ),
    mouth: "M58 88 Q70 106 82 88 Z",
  },
  thinking: {
    eyes: (
      <>
        <Ellipse cx="55" cy="75" rx="5" ry="7" fill={c.white} />
        <Ellipse cx="93" cy="75" rx="5" ry="7" fill={c.white} />
      </>
    ),
    mouth: "M63 93 L78 90",
  },
  oops: {
    eyes: (
      <>
        <Ellipse cx="51" cy="80" rx="4" ry="6" fill={c.white} />
        <Ellipse cx="89" cy="80" rx="4" ry="6" fill={c.white} />
      </>
    ),
    mouth: "M62 95 Q70 88 78 95",
  },
};

const BUBBLE_TONES: Record<KikoTone, string> = {
  info: c.lightBlue,
  success: c.success,
  error: c.error,
};

/** True while the OS "reduce motion" setting is on. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduce,
    );
    return () => listener.remove();
  }, []);
  return reduce;
}

/**
 * The Kiko mascot. `pulse` breathes gently, the `thinking` mood tilts its head,
 * and changing `bounce` plays one hop. All motion stops with reduce motion or
 * simple mode.
 */
export function Kiko({
  size = 130,
  pulse = false,
  mood = "happy",
  bounce = 0,
  decorative = false,
}: {
  size?: number;
  pulse?: boolean;
  mood?: KikoMood;
  bounce?: number;
  decorative?: boolean;
}) {
  const { t } = useTranslation();
  const simple = useApp((s) => s.simple);
  const still = useReduceMotion() || simple;
  const scale = useSharedValue(1);
  const tilt = useSharedValue(0);
  useEffect(() => {
    if (pulse && !still)
      scale.value = withRepeat(
        withTiming(PULSE_SCALE, { duration: PULSE_MS }),
        -1,
        true,
      );
    else scale.value = 1;
    return () => cancelAnimation(scale);
  }, [pulse, still, scale]);
  useEffect(() => {
    if (mood === "thinking" && !still)
      tilt.value = withRepeat(
        withSequence(
          withTiming(-TILT_DEGREES, { duration: TILT_MS }),
          withTiming(TILT_DEGREES, { duration: TILT_MS }),
        ),
        -1,
        true,
      );
    else tilt.value = withTiming(0, { duration: BOUNCE_MS });
    return () => cancelAnimation(tilt);
  }, [mood, still, tilt]);
  useEffect(() => {
    if (bounce === 0 || still) return;
    scale.value = withSequence(
      withTiming(BOUNCE_SCALE, { duration: BOUNCE_MS }),
      withTiming(1, { duration: BOUNCE_MS }),
    );
  }, [bounce, still, scale]);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${tilt.value}deg` }],
  }));
  const face = FACES[mood];
  return (
    <Animated.View
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : t("app.kikoDescription")}
      importantForAccessibility={decorative ? "no-hide-descendants" : "auto"}
      style={[{ width: size, height: size, alignSelf: "center" }, animated]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 140 140">
        <Circle cx="70" cy="75" r="55" fill={c.darkBlue} />
        <Circle
          cx="70"
          cy="68"
          r="53"
          fill={c.deepBlue}
          stroke={c.white}
          strokeWidth="7"
        />
        <Path
          d="M10 86 L0 81 M130 86 L140 81"
          stroke={c.brightBlue}
          strokeWidth="12"
          strokeLinecap="round"
        />
        <Polygon
          points="70,39 74,48 84,49 76,55 76,65 69,59 59,63 62,53 55,46 65,46"
          fill={c.coinGold}
        />
        {face.eyes}
        <Path
          d={face.mouth}
          stroke={c.white}
          strokeWidth="2"
          fill={mood === "cheer" ? c.white : "none"}
        />
      </Svg>
    </Animated.View>
  );
}

/**
 * Kiko speaking a short message in a bubble. Pressing it reads the message
 * aloud and Kiko hops, so every note also works by voice.
 */
export function KikoNote({
  message,
  mood = "happy",
  tone = "info",
  live = false,
}: {
  message: string;
  mood?: KikoMood;
  tone?: KikoTone;
  live?: boolean;
}) {
  const { t } = useTranslation();
  const language = useApp((s) => s.language);
  const [hops, setHops] = useState(0);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={message}
      accessibilityHint={t("app.kikoNoteHint")}
      accessibilityLiveRegion={live ? "polite" : "none"}
      onPress={() => {
        setHops((count) => count + 1);
        void Speech.stop();
        Speech.speak(message, { language });
      }}
      style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
    >
      <Kiko size={NOTE_KIKO_SIZE} mood={mood} bounce={hops} decorative />
      <View
        style={{
          flex: 1,
          backgroundColor: c.white,
          borderRadius: 20,
          borderBottomLeftRadius: 6,
          padding: 16,
          borderBottomWidth: 4,
          borderBottomColor: BUBBLE_TONES[tone],
        }}
      >
        <Txt>{message}</Txt>
      </View>
    </Pressable>
  );
}

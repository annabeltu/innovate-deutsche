import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import Svg, { Circle, Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { alpha, colors, radii, spacing } from "../theme/tokens";
import { Kiko } from "./Kiko";
import { Txt } from "./Txt";

const HALO_SIZE = 220;
const HALO_INNER_SIZE = 170;
const KIKO_SIZE = 130;
const HALO_OPACITY = 0.14;
const KIKO_POP_DAMPING = 12;
const TWINKLE_MS = 450;
const TWINKLE_DIM = 0.35;
const TWINKLE_SHRINK = 0.7;
const TWINKLE_TIMES = 3;
const COUNT_UP_MS = 900;
const COIN_SIZE = 22;
const SPARKLE_PATH =
  "M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z";
// Scattered around the halo at different sizes, so they read as sparkle, not a row.
const SPARKLES = [
  { left: 22, top: 26, size: 22, delay: 0 },
  { left: 186, top: 10, size: 14, delay: 180 },
  { left: 200, top: 138, size: 28, delay: 360 },
  { left: 4, top: 160, size: 12, delay: 540 },
  { left: 120, top: 196, size: 16, delay: 720 },
];

/** A gold coin drawn from tokens, used wherever coins are awarded. */
export function CoinIcon({ size = COIN_SIZE }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Circle cx={12} cy={12} r={11} fill={colors.coinGold} />
      <Circle
        cx={12}
        cy={12}
        r={7.5}
        fill="none"
        stroke={colors.coinGoldText}
        strokeWidth={1.5}
      />
      <Path
        d="M12 8.5L13 11L15.5 12L13 13L12 15.5L11 13L8.5 12L11 11Z"
        fill={colors.coinGoldText}
      />
    </Svg>
  );
}

function Sparkle({
  left,
  top,
  size,
  delay,
  still,
}: (typeof SPARKLES)[number] & { still: boolean }) {
  const glow = useSharedValue(1);
  useEffect(() => {
    if (still) return;
    glow.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(TWINKLE_DIM, { duration: TWINKLE_MS }),
          withTiming(1, { duration: TWINKLE_MS }),
        ),
        TWINKLE_TIMES,
      ),
    );
  }, [delay, glow, still]);
  const style = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: TWINKLE_SHRINK + (1 - TWINKLE_SHRINK) * glow.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", left, top }, style]}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
        <Path d={SPARKLE_PATH} fill={colors.coinGold} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Kiko on a soft green halo with gold sparkles. Kiko pops in and the
 * sparkles twinkle a few times; everything is still when `still` is set
 * (reduce motion or simple mode).
 */
export function RewardCelebration({ still }: { still: boolean }) {
  return (
    <View
      style={{
        width: HALO_SIZE,
        height: HALO_SIZE,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "absolute",
          width: HALO_SIZE,
          height: HALO_SIZE,
          borderRadius: radii.pill,
          backgroundColor: alpha(colors.success, HALO_OPACITY),
        }}
      />
      <View
        style={{
          position: "absolute",
          width: HALO_INNER_SIZE,
          height: HALO_INNER_SIZE,
          borderRadius: radii.pill,
          backgroundColor: colors.successSoft,
        }}
      />
      <Animated.View
        entering={
          still ? undefined : ZoomIn.springify().damping(KIKO_POP_DAMPING)
        }
      >
        <Kiko size={KIKO_SIZE} mood="cheer" />
      </Animated.View>
      {SPARKLES.map((sparkle) => (
        <Sparkle
          key={`${sparkle.left}-${sparkle.top}`}
          {...sparkle}
          still={still}
        />
      ))}
    </View>
  );
}

/**
 * The coins just earned in a gold pill. The number counts up from zero
 * unless `still`; screen readers always hear the final amount.
 */
export function CoinReward({
  count,
  still,
}: {
  count: number;
  still: boolean;
}) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(still ? count : 0);
  const progress = useSharedValue(still ? count : 0);
  useEffect(() => {
    if (still) {
      setShown(count);
      return;
    }
    progress.value = withTiming(count, {
      duration: COUNT_UP_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [count, progress, still]);
  useAnimatedReaction(
    () => Math.round(progress.value),
    (current, previous) => {
      if (current !== previous) scheduleOnRN(setShown, current);
    },
  );
  const label = t("app.coinsAwarded", { count });
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radii.pill,
        backgroundColor: colors.coinGoldSoft,
      }}
    >
      <CoinIcon />
      <Txt variant="subheading" tone="reward">
        {t("app.coinsAwarded", { count: shown })}
      </Txt>
    </View>
  );
}

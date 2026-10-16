import React, { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { splitSentences } from "../../lessons/lesson-text";
import type { LessonCard } from "../../types/api";
import { colors, depth, layout, radii, spacing } from "../../theme/tokens";
import { Txt } from "../Txt";
import { KeyText } from "./LessonText";

const FLIP_HALF_MS = 140;
const SIDE_MIN_HEIGHT = 150;
const FLIP_ICON_SIZE = 28;

/**
 * Bridge card: the learner's country and the bigger picture as two cards
 * side by side, each flipping over on tap to show its fact.
 */
export function BridgeCard({
  card,
  flipped,
  onFlip,
  still,
}: {
  card: LessonCard;
  flipped: [boolean, boolean];
  onFlip: (side: 0 | 1) => void;
  still: boolean;
}) {
  const { t } = useTranslation();
  const [first = "", ...rest] = splitSentences(card.text);
  const facts = [first, rest.join(" ")] as const;
  const labels = [t("lessonCard.yourCountry"), t("lessonCard.biggerPicture")];
  return (
    <View style={{ flexDirection: "row", gap: layout.itemGap }}>
      {([0, 1] as const).map((side) => (
        <FlipSide
          key={side}
          label={labels[side]}
          fact={facts[side]}
          flipped={flipped[side]}
          onFlip={() => onFlip(side)}
          still={still}
          icon={side === 0 ? "home" : "globe"}
        />
      ))}
    </View>
  );
}

function FlipSide({
  label,
  fact,
  flipped,
  onFlip,
  still,
  icon,
}: {
  label: string;
  fact: string;
  flipped: boolean;
  onFlip: () => void;
  still: boolean;
  icon: React.ComponentProps<typeof Feather>["name"];
}) {
  const { t } = useTranslation();
  const squash = useSharedValue(1);
  useEffect(() => {
    if (!flipped || still) return;
    // Squash to an edge and open again: reads as a card turning over.
    squash.value = withSequence(
      withTiming(0, { duration: FLIP_HALF_MS }),
      withTiming(1, { duration: FLIP_HALF_MS }),
    );
  }, [flipped, still, squash]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scaleX: squash.value }],
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={flipped ? `${label}. ${fact}` : label}
      accessibilityHint={flipped ? undefined : t("lessonCard.flipHint")}
      accessibilityState={{ expanded: flipped }}
      disabled={flipped}
      onPress={onFlip}
      style={{ flex: 1 }}
    >
      <Animated.View
        style={[
          {
            flex: 1,
            minHeight: SIDE_MIN_HEIGHT,
            padding: spacing.md,
            gap: spacing.sm,
            borderRadius: radii.option,
            borderBottomWidth: depth.option,
            backgroundColor: flipped ? colors.white : colors.deepBlue,
            borderBottomColor: flipped ? colors.lightBlue : colors.darkBlue,
            justifyContent: flipped ? "flex-start" : "center",
            alignItems: flipped ? "stretch" : "center",
          },
          style,
        ]}
      >
        {flipped ? (
          <>
            <Txt variant="caption" tone="brand" weight="bold">
              {label.toUpperCase()}
            </Txt>
            <KeyText text={fact} variant="small" />
          </>
        ) : (
          <>
            <Feather name={icon} size={FLIP_ICON_SIZE} color={colors.white} />
            <Txt light weight="bold" style={{ textAlign: "center" }}>
              {label}
            </Txt>
            <Txt variant="caption" light>
              {t("lessonCard.flip")}
            </Txt>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

import React from "react";
import { Pressable, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { cardSections } from "../../lessons/lesson-text";
import type { LessonCard } from "../../types/api";
import {
  colors,
  layout,
  minTapTarget,
  radii,
  spacing,
} from "../../theme/tokens";
import { CoinReward } from "../RewardCelebration";
import { Txt } from "../Txt";
import { KeyText, LessonRow } from "./LessonText";

const REVEAL_ICON_SIZE = 20;
const CHECK_SIZE = 64;
const CHECK_ICON_SIZE = 36;
const CHECK_DAMPING = 10;

/**
 * Concept card: the first sentence as a short bold title, the rest as
 * short rows that the learner taps to reveal.
 */
export function ConceptCard({
  card,
  revealed,
  onReveal,
}: {
  card: LessonCard;
  revealed: boolean;
  onReveal: () => void;
}) {
  const { t } = useTranslation();
  const { title, rows } = cardSections(card.text);
  return (
    <View style={{ gap: layout.itemGap }}>
      <KeyText text={title} variant="heading" />
      {rows.length > 0 &&
        (revealed ? (
          rows.map((row) => <LessonRow key={row} text={row} />)
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("lessonCard.reveal")}
            accessibilityHint={t("lessonCard.revealHint")}
            onPress={onReveal}
            style={{
              minHeight: minTapTarget,
              borderRadius: radii.option,
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: colors.lightBlue,
              backgroundColor: colors.iceBlue,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: spacing.sm,
            }}
          >
            <Feather
              name="eye"
              size={REVEAL_ICON_SIZE}
              color={colors.deepBlue}
            />
            <Txt tone="brand" weight="bold">
              {t("lessonCard.reveal")}
            </Txt>
          </Pressable>
        ))}
    </View>
  );
}

/**
 * Takeaway card: the one-line summary with a check that pops in, and the
 * coins this lesson earns when it is finished for the first time.
 */
export function TakeawayCard({
  card,
  rewardCoins,
  still,
}: {
  card: LessonCard;
  rewardCoins: number;
  still: boolean;
}) {
  const { t } = useTranslation();
  const { title, rows } = cardSections(card.text);
  return (
    <View style={{ alignItems: "center", gap: layout.itemGap }}>
      <Animated.View
        entering={still ? undefined : ZoomIn.springify().damping(CHECK_DAMPING)}
        style={{
          width: CHECK_SIZE,
          height: CHECK_SIZE,
          borderRadius: radii.pill,
          backgroundColor: colors.successSurface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather
          name="check"
          size={CHECK_ICON_SIZE}
          color={colors.successText}
        />
      </Animated.View>
      <Txt variant="caption" tone="positive" weight="bold">
        {t("lessonCard.keyTakeaway").toUpperCase()}
      </Txt>
      <View style={{ alignSelf: "stretch", gap: layout.itemGap }}>
        <KeyText text={title} variant="heading" />
        {rows.map((row) => (
          <LessonRow key={row} text={row} />
        ))}
      </View>
      {rewardCoins > 0 && <CoinReward count={rewardCoins} still={still} />}
    </View>
  );
}

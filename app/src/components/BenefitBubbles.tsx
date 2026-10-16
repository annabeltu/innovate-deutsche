import React from "react";
import { View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useApp } from "../state/useApp";
import { alpha, colors, depth, radii, spacing } from "../theme/tokens";
import { useReduceMotion } from "./Kiko";
import { Txt } from "./Txt";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

const BENEFITS: readonly [FeatherName, string][] = [
  ["message-circle", "questionBenefit"],
  ["book-open", "answerBenefit"],
  ["zap", "lessonBenefit"],
];
const BUBBLE_SIZE = 44;
const BUBBLE_ICON_SIZE = 22;
const BUBBLE_DEPTH = 3;
const GLOSS_SIZE = 12;
const GLOSS_INSET = 7;
const GLOSS_OPACITY = 0.45;
const POP_STAGGER_MS = 90;
const POP_DAMPING = 11;

/** A round icon bubble with a darker bottom edge and a gloss highlight. */
export function IconBubble({
  icon,
  size = BUBBLE_SIZE,
}: {
  icon: FeatherName;
  size?: number;
}) {
  const scale = size / BUBBLE_SIZE;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radii.pill,
        backgroundColor: colors.brightBlue,
        borderBottomWidth: BUBBLE_DEPTH,
        borderBottomColor: colors.deepBlue,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "absolute",
          top: GLOSS_INSET * scale,
          left: GLOSS_INSET * scale,
          width: GLOSS_SIZE * scale,
          height: (GLOSS_SIZE / 2) * scale,
          borderRadius: radii.pill,
          backgroundColor: alpha(colors.white, GLOSS_OPACITY),
          transform: [{ rotate: "-30deg" }],
        }}
      />
      <Feather
        name={icon}
        size={BUBBLE_ICON_SIZE * scale}
        color={colors.white}
      />
    </View>
  );
}

/**
 * What Ask Kiko offers, as three raised bubble tiles that pop in one after
 * another. They stay still with reduce motion or simple mode.
 */
export function BenefitBubbles() {
  const { t } = useTranslation();
  const simple = useApp((state) => state.simple);
  const still = useReduceMotion() || simple;
  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      {BENEFITS.map(([icon, key], index) => (
        <Animated.View
          key={key}
          entering={
            still
              ? undefined
              : ZoomIn.delay(index * POP_STAGGER_MS)
                  .springify()
                  .damping(POP_DAMPING)
          }
          style={{
            flex: 1,
            alignItems: "center",
            gap: spacing.sm,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.md,
            borderRadius: radii.option,
            backgroundColor: colors.white,
            borderBottomWidth: depth.option,
            borderBottomColor: colors.lightBlue,
          }}
        >
          <IconBubble icon={icon} />
          <Txt variant="caption" weight="bold" style={{ textAlign: "center" }}>
            {t(`askScreen.${key}`)}
          </Txt>
        </Animated.View>
      ))}
    </View>
  );
}

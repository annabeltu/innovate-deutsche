import React from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { highlightRuns } from "../../lessons/lesson-text";
import { colors, radii, spacing } from "../../theme/tokens";
import { Txt } from "../Txt";
import type { TypeVariant } from "../../theme/tokens";

const ROW_ICON_SIZE = 16;
const ROW_ICON_BUBBLE = 28;

/**
 * Card text with its numbers and amounts set in a bold deep-blue chip, or
 * in red when `flagged` (red flags in a scam message after answering).
 */
export function KeyText({
  text,
  variant = "body",
  flagged = false,
}: {
  text: string;
  variant?: TypeVariant;
  flagged?: boolean;
}) {
  return (
    <Txt variant={variant} weight={variant === "heading" ? "bold" : undefined}>
      {highlightRuns(text).map((run, index) =>
        run.key ? (
          <Txt
            key={index}
            variant={variant}
            weight="bold"
            style={{
              color: flagged ? colors.errorText : colors.deepBlue,
              backgroundColor: flagged ? colors.warningSurface : colors.iceBlue,
            }}
          >
            {run.text}
          </Txt>
        ) : (
          run.text
        ),
      )}
    </Txt>
  );
}

/** One short line of a card, with a small icon bubble in front. */
export function LessonRow({
  text,
  icon = "check",
}: {
  text: string;
  icon?: React.ComponentProps<typeof Feather>["name"];
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: spacing.md,
      }}
    >
      <View
        style={{
          width: ROW_ICON_BUBBLE,
          height: ROW_ICON_BUBBLE,
          borderRadius: radii.pill,
          backgroundColor: colors.iceBlue,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather name={icon} size={ROW_ICON_SIZE} color={colors.deepBlue} />
      </View>
      <View style={{ flex: 1 }}>
        <KeyText text={text} />
      </View>
    </View>
  );
}

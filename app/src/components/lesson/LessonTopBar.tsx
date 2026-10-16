import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import { useApp } from "../../state/useApp";
import { colors, spacing } from "../../theme/tokens";
import { IconButton, Progress, Txt } from "../ui";

const HEART_ICON_SIZE = 20;

/** Close, lesson progress and hearts in one row above the card. */
export function LessonTopBar({ progress }: { progress: number }) {
  const { t } = useTranslation();
  const hearts = useApp((state) => state.hearts);
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}
    >
      <IconButton
        icon="x"
        accessibilityLabel={t("lessonCard.close")}
        accessibilityHint={t("lessonCard.closeHint")}
        onPress={() => router.replace("/roadmap")}
      />
      <View style={{ flex: 1, height: spacing.sm }}>
        <Progress value={progress} />
      </View>
      <View
        accessible
        accessibilityLabel={t("app.hearts", { count: hearts })}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
        }}
      >
        <Feather name="heart" size={HEART_ICON_SIZE} color={colors.errorText} />
        <Txt weight="bold">{hearts}</Txt>
      </View>
    </View>
  );
}

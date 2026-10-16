import React from "react";
import { Txt } from "./Txt";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useApp } from "../state/useApp";

/** Persistent, dismissible confirmation; closing it never removes the lesson. */
export function BonusNotification() {
  const pending = useApp((state) => state.pendingBonus);
  const bonus = useApp((state) => state.bonus);
  const { t } = useTranslation();
  if (!pending) return null;
  const title = pending.startsWith("i18n:") ? t(pending.slice(5)) : pending;
  return (
    <View className="mx-4 mb-2 flex-row items-center gap-2 rounded-2xl bg-white p-3">
      <Txt accessible={false} variant="heading" weight="regular">
        🎉
      </Txt>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("experience.newLessonLabel", { title })}
        accessibilityHint={t("roadmapScreen.lessonHint")}
        onPress={() => {
          const index = bonus.indexOf(pending);
          if (index >= 0)
            router.push({
              pathname: "/lesson",
              params: { id: `bonus-${index}` },
            });
        }}
        className="min-h-11 flex-1 justify-center"
      >
        <Txt accessibilityLiveRegion="polite" tone="brand" weight="bold">
          {t("experience.newLesson")}
        </Txt>
        <Txt variant="caption">{title}</Txt>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("experience.dismiss")}
        accessibilityHint={t("experience.dismissHint")}
        onPress={() => useApp.getState().dismissBonus()}
        className="min-h-11 min-w-11 items-center justify-center"
      >
        <Txt variant="heading" tone="brand" weight="regular">
          ×
        </Txt>
      </Pressable>
    </View>
  );
}

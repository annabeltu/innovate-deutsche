import React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useApp } from "../state/useApp";

/** Highlight actual extra lessons on a branch of the learner’s roadmap. */
export function BonusLessons() {
  const bonus = useApp((state) => state.bonus);
  const completed = useApp((state) => state.completed);
  const { t } = useTranslation();
  return (
    <View className="gap-3 py-2">
      {bonus.map((title, index) => {
        const label = title.startsWith("i18n:") ? t(title.slice(5)) : title;
        const id = `bonus-${index}`;
        return (
          <View
            key={`${title}-${index}`}
            className="ml-8 flex-row items-center gap-2"
          >
            <View
              accessible={false}
              className="w-6 border-t-2 border-dashed border-white"
            />
            <View
              accessible={false}
              className="h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-brand"
            >
              <Text className="text-3xl">⭐</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityHint={t("roadmapScreen.lessonHint")}
              onPress={() =>
                router.push({ pathname: "/lesson", params: { id } })
              }
              className="min-h-20 flex-1 gap-1 rounded-2xl bg-white p-3"
            >
              <Text className="self-start rounded-full bg-brand px-2 py-1 text-xs font-bold text-white">
                {t(
                  completed.includes(id)
                    ? "roadmapScreen.completed"
                    : "shopScreen.new",
                )}
              </Text>
              <Text className="font-bold text-brand">{label}</Text>
              <Text className="text-xs text-ink">
                {t("experience.youAsked")}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

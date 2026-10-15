import React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useApp } from "../state/useApp";
import { useBonusLessons } from "../api/lessons";
import { ApiError } from "../api/client";

/** Highlight actual extra lessons on a branch of the learner’s roadmap. */
export function BonusLessons() {
  const bonus = useApp((state) => state.bonus);
  const completed = useApp((state) => state.completed);
  const { t } = useTranslation();
  // API lessons reload in the active language; local ones use an i18n key.
  const lessons = useBonusLessons();
  const labelFor = (title: string, index: number) => {
    const lesson = lessons[index];
    if (lesson?.data?.title) return lesson.data.title;
    if (title.startsWith("i18n:")) return t(title.slice(5));
    if (!lesson?.isError)
      return lesson?.fetchStatus === "fetching" ? t("app.loadingBonus") : title;
    return t(
      lesson.error instanceof ApiError &&
        lesson.error.code === "lesson_translation_failed"
        ? "app.bonusError"
        : "lessonError",
    );
  };
  // A lesson the API reports as missing will never load (e.g. it belonged to
  // an earlier learner), so leave it off the roadmap instead of erroring.
  const missing = (index: number) => {
    const error = lessons[index]?.error;
    return error instanceof ApiError && error.code === "lesson_not_found";
  };
  return (
    <View className="gap-3 py-2">
      {bonus.map((title, index) => {
        if (missing(index)) return null;
        const label = labelFor(title, index);
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

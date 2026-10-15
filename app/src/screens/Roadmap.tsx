import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import Svg, { Image as SvgImage, Path } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen } from "../components/ui";
import { useApp } from "../state/useApp";
import { Badge, RoadmapNavigation } from "../components/RoadmapChrome";
import { colors } from "../theme/tokens";
import { buildRoadmap } from "../onboarding/roadmap";
import { useBonusLessons } from "../api/lessons";
import { ApiError } from "../api/client";
import { KompassLogo } from "../components/KompassLogo";
import { useWindowSize } from "../hooks/use-window-size";

const scenes = {
  US: require("../../assets/welcome/us.png"),
  MX: require("../../assets/welcome/mx.png"),
  KE: require("../../assets/welcome/ke.png"),
};
const reference = require("../../assets/roadmap/reference.png");
const nodePositions = [0.32, 0.42, 0.4, 0.43, 0.4];

/** Scenic roadmap using the same confidence ordering as the preceding preview. */
export function Roadmap() {
  const country = useApp((state) => state.country);
  const confidence = useApp((state) => state.confidence);
  const completed = useApp((state) => state.completed);
  const streak = useApp((state) => state.streak);
  const coins = useApp((state) => state.coins);
  const hearts = useApp((state) => state.hearts);
  const bonus = useApp((state) => state.bonus);
  // Reload bonus titles in the active language instead of the saved title.
  const bonusLessons = useBonusLessons();
  const { width, fontScale } = useWindowSize();
  const { t } = useTranslation();
  const path = buildRoadmap(confidence, completed);
  const mapWidth = width - 32;
  const rowHeight = fontScale > 1.3 ? 138 : 98;
  const badgeSize = Math.min(76, mapWidth * 0.23);
  const openLesson = (id: string) =>
    router.push({ pathname: "/lesson", params: { id } });
  const curve = `M ${mapWidth * 0.15} 0 C ${mapWidth * 0.8} ${rowHeight}, ${mapWidth * 0.55} ${rowHeight * 1.3}, ${mapWidth * 0.42} ${rowHeight * 2} S ${mapWidth * 0.7} ${rowHeight * 3}, ${mapWidth * 0.43} ${rowHeight * 4} S ${mapWidth * 0.5} ${rowHeight * 5}, ${mapWidth * 0.25} ${rowHeight * 5.5}`;
  return (
    <Screen
      compact
      background={
        <Image
          source={scenes[country]}
          resizeMode="cover"
          className="absolute h-full w-full"
          accessible={false}
        />
      }
      footer={<RoadmapNavigation />}
    >
      <View className="flex-row items-center justify-between gap-2">
        <KompassLogo size={24} />
        <View className="flex-row gap-1">
          {[
            ["🔥", streak, "streak"],
            ["🪙", coins, "coins"],
            ["♥️", hearts, "hearts"],
          ].map(([icon, value, key]) => (
            <View
              key={key}
              accessible
              accessibilityLabel={t(`roadmapScreen.${key}`, { count: value })}
              className="min-h-10 flex-row items-center justify-center rounded-full bg-white px-2"
            >
              <Text className="text-xs font-bold text-ink">
                {icon} {value}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <View className="rounded-3xl bg-brand px-5 py-4">
        <Text className="text-xs font-bold text-white">
          {t("roadmapScreen.unit")}
        </Text>
        <View className="mt-1 flex-row items-center justify-between gap-3">
          <Text
            accessibilityRole="header"
            className="flex-1 text-3xl font-bold text-white"
          >
            {t("roadmapScreen.title")}
          </Text>
          <Text className="text-3xl text-white">›</Text>
          <Text className="w-24 text-xs text-white">
            {t("roadmapScreen.subtitle")}
          </Text>
        </View>
      </View>
      <View style={{ minHeight: rowHeight * 5.6 }}>
        <View pointerEvents="none" className="absolute inset-0">
          <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${mapWidth} ${rowHeight * 5.6}`}
            accessible={false}
          >
            <Path
              d={curve}
              fill="none"
              stroke={colors.lightBlue}
              strokeWidth={20}
            />
            <Path
              d={curve}
              fill="none"
              stroke={colors.white}
              strokeWidth={13}
            />
            <Path
              d={curve}
              fill="none"
              stroke={colors.brightBlue}
              strokeWidth={1.5}
              strokeDasharray="5 5"
            />
          </Svg>
        </View>
        {path.map((lesson, index) => {
          const title = t(`confidenceTopics.${lesson.topic}`);
          return (
            <View
              key={lesson.topic}
              className="justify-center"
              style={{
                minHeight: rowHeight,
                paddingLeft: mapWidth * nodePositions[index],
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${title}. ${t(`roadmapScreen.${lesson.status}`)}`}
                accessibilityHint={t(
                  lesson.status === "locked"
                    ? "roadmapScreen.lockedHint"
                    : "roadmapScreen.lessonHint",
                )}
                accessibilityState={{ disabled: lesson.status === "locked" }}
                disabled={lesson.status === "locked"}
                onPress={() => openLesson(lesson.topic)}
                className="min-h-14 flex-row items-center rounded-2xl bg-white py-3 pr-2"
                style={{ paddingLeft: badgeSize * 0.65 }}
              >
                <View className="absolute" style={{ left: -badgeSize * 0.42 }}>
                  <Badge
                    topic={lesson.topic}
                    status={lesson.status}
                    size={badgeSize}
                  />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-sm font-bold text-ink">{title}</Text>
                  <Text
                    className={
                      lesson.status === "completed"
                        ? "text-xs font-semibold text-brand"
                        : "text-xs text-ink"
                    }
                  >
                    {lesson.status === "completed"
                      ? "✓ "
                      : lesson.status === "current"
                        ? "▶ "
                        : ""}
                    {t(`roadmapScreen.${lesson.status}`)}
                  </Text>
                </View>
                <Text className="text-xl text-brand">›</Text>
              </Pressable>
              {lesson.status === "current" && (
                <View pointerEvents="none" className="absolute left-0 top-4">
                  <Image
                    source={require("../../assets/challenges/kiko-happy-transparent.png")}
                    resizeMode="contain"
                    accessible={false}
                    style={{ width: mapWidth * 0.23, height: rowHeight * 0.9 }}
                  />
                </View>
              )}
            </View>
          );
        })}
        <View className="mt-3 flex-row items-center gap-3 rounded-2xl bg-white p-3">
          <Svg
            width={62}
            height={64}
            viewBox="246 1364 152 145"
            accessible={false}
          >
            <SvgImage href={reference} width={883} height={1782} />
          </Svg>
          <View className="flex-1">
            <Text className="font-bold text-ink">
              {t(
                path.every((lesson) => lesson.status === "completed")
                  ? "roadmapScreen.unitDone"
                  : "roadmapScreen.finishUnit",
              )}
            </Text>
            <Text className="text-xs text-ink">
              {t("roadmapScreen.reward")}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("roadmapScreen.ask")}
            accessibilityHint={t("roadmapScreen.askHint")}
            onPress={() => router.push("/ask")}
            className="min-h-14 min-w-14 items-center justify-center rounded-full bg-brand p-3"
          >
            <Feather name="mic" size={22} color={colors.white} />
            <Text className="text-xs text-white">{t("ask")}</Text>
          </Pressable>
        </View>
      </View>
      {bonus.map((saved, index) => {
        const lesson = bonusLessons[index];
        const title =
          lesson?.data?.title ??
          t(
            !lesson?.isError
              ? "app.loadingBonus"
              : lesson.error instanceof ApiError &&
                  lesson.error.code === "lesson_translation_failed"
                ? "app.bonusError"
                : "lessonError",
          );
        return (
          <Pressable
            key={`${saved}-${index}`}
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityHint={t("roadmapScreen.lessonHint")}
            onPress={() => openLesson(`bonus-${index}`)}
            className="min-h-14 rounded-2xl bg-white p-3"
          >
            <Text className="font-bold text-ink">✦ {title}</Text>
            <Text className="text-xs text-brand">
              {t("roadmapScreen.bonus")}
            </Text>
          </Pressable>
        );
      })}
    </Screen>
  );
}

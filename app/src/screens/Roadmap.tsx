import {
  BADGE_CENTER_OFFSET,
  BADGE_OVERLAP,
  BADGE_TEXT_INSET,
  BonusLessons,
} from "../components/BonusLessons";
import { RoadLine, useRoad } from "../components/RoadLine";
import { Txt } from "../components/Txt";
import { SCENERY_FILL } from "../components/AppScenery";
import { BonusNotification } from "../components/BonusNotification";
import { KikoAvatar } from "../components/KikoAvatar";
import React from "react";
import { Image, Pressable, View } from "react-native";
import Svg, { Image as SvgImage } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Card, Nav, Screen } from "../components/ui";
import { useApp } from "../state/useApp";
import { Badge } from "../components/RoadmapChrome";
import { colors, layout } from "../theme/tokens";
import { buildRoadmap } from "../onboarding/roadmap";
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
  const { width, fontScale } = useWindowSize();
  const { t } = useTranslation();
  const path = buildRoadmap(confidence, completed);
  const mapWidth = width - layout.pagePadding * 2;
  const rowHeight = fontScale > 1.3 ? 138 : 98;
  const badgeSize = Math.min(76, mapWidth * 0.23);
  const openLesson = (id: string) =>
    router.push({ pathname: "/lesson", params: { id } });
  const road = useRoad(mapWidth, rowHeight, badgeSize);
  return (
    <Screen
      compact
      background={
        <Image
          source={scenes[country]}
          resizeMode="cover"
          style={SCENERY_FILL}
          accessible={false}
        />
      }
      footer={
        <View>
          <BonusNotification />
          <Nav />
        </View>
      }
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
              <Txt variant="caption" weight="bold">
                {icon} {value}
              </Txt>
            </View>
          ))}
        </View>
      </View>
      <View className="rounded-3xl bg-brand px-5 py-4">
        <Txt variant="caption" light weight="bold">
          {t("roadmapScreen.unit")}
        </Txt>
        <View className="mt-1 flex-row items-center justify-between gap-3">
          <Txt
            accessibilityRole="header"
            variant="title"
            light
            weight="bold"
            className="flex-1"
          >
            {t("roadmapScreen.title")}
          </Txt>
          <Txt variant="title" light>
            ›
          </Txt>
          <Txt variant="caption" light className="w-24">
            {t("roadmapScreen.subtitle")}
          </Txt>
        </View>
      </View>
      <View testID="roadmap-path" onLayout={road.onLayout}>
        <RoadLine d={road.path} />
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
              onLayout={(event) => {
                const { y, height } = event.nativeEvent.layout;
                road.layout.onNode(lesson.topic, {
                  x:
                    mapWidth * nodePositions[index] +
                    badgeSize * BADGE_CENTER_OFFSET,
                  y: y + height / 2,
                });
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
                style={{ paddingLeft: badgeSize * BADGE_TEXT_INSET }}
              >
                <View
                  className="absolute"
                  style={{ left: -badgeSize * BADGE_OVERLAP }}
                >
                  <Badge
                    topic={lesson.topic}
                    status={lesson.status}
                    size={badgeSize}
                  />
                </View>
                <View className="flex-1 gap-1">
                  <Txt variant="small" weight="bold">
                    {title}
                  </Txt>
                  <Txt
                    variant="caption"
                    tone={lesson.status === "completed" ? "brand" : "ink"}
                    weight={
                      lesson.status === "completed" ? "semibold" : "regular"
                    }
                  >
                    {lesson.status === "completed"
                      ? "✓ "
                      : lesson.status === "current"
                        ? "▶ "
                        : ""}
                    {t(`roadmapScreen.${lesson.status}`)}
                  </Txt>
                </View>
                <Txt variant="heading" tone="brand" weight="regular">
                  ›
                </Txt>
              </Pressable>
              {lesson.status === "current" && (
                <View pointerEvents="none" className="absolute left-0 top-4">
                  <KikoAvatar size={mapWidth * 0.23} />
                </View>
              )}
            </View>
          );
        })}
        {bonus.length > 0 && <BonusLessons road={road.layout} />}
      </View>
      <Card style={{ flexDirection: "row", alignItems: "center" }}>
        <Svg
          width={62}
          height={64}
          viewBox="246 1364 152 145"
          accessible={false}
        >
          <SvgImage href={reference} width={883} height={1782} />
        </Svg>
        <View className="flex-1">
          <Txt weight="bold">
            {t(
              path.every((lesson) => lesson.status === "completed")
                ? "roadmapScreen.unitDone"
                : "roadmapScreen.finishUnit",
            )}
          </Txt>
          <Txt variant="caption">{t("roadmapScreen.reward")}</Txt>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("roadmapScreen.ask")}
          accessibilityHint={t("roadmapScreen.askHint")}
          onPress={() => router.push("/ask")}
          className="min-h-14 min-w-14 items-center justify-center rounded-full bg-brand p-3"
        >
          <Feather name="mic" size={22} color={colors.white} />
          <Txt variant="caption" light>
            {t("ask")}
          </Txt>
        </Pressable>
      </Card>
    </Screen>
  );
}

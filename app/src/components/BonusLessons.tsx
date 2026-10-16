import React, { useEffect } from "react";
import { Txt } from "./Txt";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useApp } from "../state/useApp";
import { useBonusLessons } from "../api/lessons";
import { ApiError } from "../api/client";
import type { RoadPoint } from "../onboarding/road-path";
import { spacing } from "../theme/tokens";

/** Where the roadmap places nodes and how a node reports its position. */
export type RoadLayout = {
  mapWidth: number;
  rowHeight: number;
  badgeSize: number;
  /** Report a node's centre, or null when it leaves the map. */
  onNode: (id: string, point: RoadPoint | null) => void;
};

// Custom lessons zigzag gently below the core lessons, like the core path.
const BONUS_POSITIONS = [0.36, 0.44];
// The badge overlaps the card's left edge; these match the core lesson nodes.
export const BADGE_OVERLAP = 0.42;
export const BADGE_TEXT_INSET = 0.65;
export const BADGE_CENTER_OFFSET = 0.5 - BADGE_OVERLAP;
const DEFAULT_BADGE_SIZE = 64;

/**
 * The learner's custom lessons as nodes that continue the roadmap road.
 * With `road`, each node reports its centre so the road runs through it.
 */
export function BonusLessons({ road }: { road?: RoadLayout } = {}) {
  const badgeSize = road?.badgeSize ?? DEFAULT_BADGE_SIZE;
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
  // A lesson that turns out to be missing leaves the road too.
  const missingIds = bonus
    .map((_, index) => (missing(index) ? `bonus-${index}` : null))
    .filter((id): id is string => id !== null)
    .join(",");
  const onNode = road?.onNode;
  useEffect(() => {
    if (!onNode || !missingIds) return;
    for (const id of missingIds.split(",")) onNode(id, null);
  }, [missingIds, onNode]);
  return (
    <>
      {bonus.map((title, index) => {
        if (missing(index)) return null;
        const label = labelFor(title, index);
        const id = `bonus-${index}`;
        const done = completed.includes(id);
        const offset = road
          ? road.mapWidth * BONUS_POSITIONS[index % BONUS_POSITIONS.length]
          : 0;
        return (
          <View
            key={`${title}-${index}`}
            className="justify-center"
            style={{
              minHeight: road?.rowHeight,
              paddingLeft: offset,
              // Leave a stretch of road visible between these taller cards.
              paddingVertical: spacing.md,
            }}
            onLayout={(event) => {
              if (!road) return;
              const { y, height } = event.nativeEvent.layout;
              road.onNode(id, {
                x: offset + road.badgeSize * BADGE_CENTER_OFFSET,
                y: y + height / 2,
              });
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityHint={t("roadmapScreen.lessonHint")}
              onPress={() =>
                router.push({ pathname: "/lesson", params: { id } })
              }
              className="min-h-14 flex-row items-center rounded-2xl bg-white py-3 pr-2"
              style={{ paddingLeft: badgeSize * BADGE_TEXT_INSET }}
            >
              <View
                accessible={false}
                className="absolute items-center justify-center rounded-full border-4 border-white bg-brand"
                style={{
                  left: -badgeSize * BADGE_OVERLAP,
                  width: badgeSize,
                  height: badgeSize,
                }}
              >
                <Txt variant="heading">⭐</Txt>
              </View>
              <View className="flex-1 gap-1">
                <Txt
                  variant="caption"
                  light
                  weight="bold"
                  className="self-start rounded-full bg-brand px-2 py-1"
                >
                  {t(done ? "roadmapScreen.completed" : "shopScreen.new")}
                </Txt>
                <Txt variant="small" tone="brand" weight="bold">
                  {label}
                </Txt>
                <Txt variant="caption">{t("experience.youAsked")}</Txt>
              </View>
              <Txt variant="heading" tone="brand" weight="regular">
                ›
              </Txt>
            </Pressable>
          </View>
        );
      })}
    </>
  );
}

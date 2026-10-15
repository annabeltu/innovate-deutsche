import React from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import Svg, { Image as SvgImage, Path } from "react-native-svg";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { KikoNote, Screen, Progress } from "../components/ui";
import { Action } from "./Confidence";
import { useApp } from "../state/useApp";
import { colors } from "../theme/tokens";
import { usePath } from "../api/path";
import { topics } from "../onboarding/request";

const reference = require("../../assets/path/reference.png");
const artRegions = {
  accounts: "148 876 126 127",
  saving: "148 701 126 127",
  budget: "148 1061 126 127",
  scams: "142 1234 138 150",
  borrowing: "148 1431 126 127",
};

// Crop only illustrations from the supplied design; all text and controls stay native.
function ReferenceArt({
  region,
  width,
  height,
}: {
  region: string;
  width: number;
  height: number;
}) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox={region}
      preserveAspectRatio="xMidYMid meet"
      accessible={false}
    >
      <SvgImage href={reference} x={0} y={0} width={882} height={1783} />
    </Svg>
  );
}

/** Reference-proportioned lesson preview with confidence-based ordering and reasons. */
export function PersonalizedPath() {
  const confidence = useApp((state) => state.confidence);
  const large = useApp((state) => state.large);
  const { width, height, fontScale } = useWindowDimensions();
  const { t } = useTranslation();
  const result = usePath();
  if (result.isPending)
    return (
      <Screen>
        <KikoNote mood="thinking" message={t("app.pathLoading")} live />
      </Screen>
    );
  if (result.isError)
    return (
      <Screen>
        <KikoNote live mood="oops" tone="error" message={t("app.pathError")} />
        <Action
          title={t("tryAgain")}
          hint={t("pathPreview.previewHint")}
          onPress={() => void result.refetch()}
        />
      </Screen>
    );
  const path = result.data.lessons.map((lesson) => {
    const score = confidence[topics.indexOf(lesson.topic)] ?? 0.5;
    return {
      ...lesson,
      band: score < 0.4 ? "low" : score < 0.7 ? "medium" : "high",
    };
  });
  const unit = Math.min(
    Math.min(width, 540) / 390,
    Math.max(0.85, height / 800),
  );
  const expanded = large || fontScale > 1.3 || width < 350;
  const openLesson = (topic: string) => {
    useApp.getState().set({ onboarded: true });
    router.push({ pathname: "/lesson", params: { id: topic } });
  };
  return (
    <Screen
      compact
      background={
        <View pointerEvents="none" className="absolute inset-0">
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 390 800"
            preserveAspectRatio="none"
            accessible={false}
          >
            <Path
              d="M10 115 l10 12 -4 6 -10 -12Z M285 25 l12 7 -3 6 -12 -7Z M360 105 l14 -9 4 6 -14 9Z M18 518 l-12 12 -4 -5 12 -12Z M377 570 l12 8 -3 6 -12 -8Z M20 742 l12 -9 4 5 -12 9Z M185 116 l4 5 -4 5 -4 -5Z M332 283 l4 6 -4 5 -4 -5Z"
              fill={colors.coinGold}
            />
          </Svg>
        </View>
      }
      footer={
        <View
          className="self-center px-6 pb-3 pt-2"
          style={{ width: Math.min(width, 540) }}
        >
          <Action
            title={t("pathPreview.start")}
            hint={t("pathPreview.openHint")}
            onPress={() => openLesson(path[0].topic)}
          />
        </View>
      }
    >
      <View className="px-2">
        <View
          className="flex-row items-center justify-between"
          style={{ marginBottom: 14 * unit }}
        >
          <ReferenceArt
            region="87 98 258 96"
            width={164 * unit}
            height={61 * unit}
          />
          <Text className="rounded-xl bg-ice px-3 py-2 font-bold text-brand">
            {t("confidenceStep")}
          </Text>
        </View>
        <View style={{ height: 7 * unit }}>
          <Progress value={0.7} />
        </View>
        <View
          className="relative justify-center"
          style={{ minHeight: 174 * unit, marginTop: 12 * unit }}
        >
          <View className="absolute right-0 top-0" pointerEvents="none">
            <ReferenceArt
              region="487 267 348 382"
              width={158 * unit}
              height={174 * unit}
            />
          </View>
          <View style={{ width: "57%" }}>
            <Text
              accessibilityRole="header"
              className="font-bold text-ink"
              style={{
                fontSize: 30 * unit,
                lineHeight: 33 * unit,
                letterSpacing: -0.8 * unit,
              }}
            >
              {t("pathPreview.titleLead")}
            </Text>
            <Text
              className="font-bold text-brand"
              style={{
                fontSize: 30 * unit,
                lineHeight: 33 * unit,
                letterSpacing: -0.8 * unit,
              }}
            >
              {t("pathPreview.titleReady")}
            </Text>
            <Text
              className="mt-2 text-brand"
              style={{ fontSize: 13 * unit, lineHeight: 18 * unit }}
            >
              {t("pathPreview.intro")}
            </Text>
          </View>
        </View>
        <Text
          accessibilityRole="header"
          className="mb-3 mt-1 font-bold text-ink"
          style={{ fontSize: 14 * unit }}
        >
          {t("pathPreview.lessons")}
        </Text>
        <View style={{ gap: 7 * unit }}>
          {path.map((lesson, index) => {
            const title = t(`confidenceTopics.${lesson.topic}`);
            const reason = `${t(`pathPreview.${lesson.band}`)} ${t(`pathPreview.details.${lesson.topic}`)}`;
            return (
              <Pressable
                key={lesson.topic}
                accessibilityRole="button"
                accessibilityLabel={`${index + 1}. ${title}. ${reason}`}
                accessibilityHint={t("pathPreview.openHint")}
                onPress={() => openLesson(lesson.topic)}
                className="flex-row items-center rounded-2xl bg-white"
                style={{
                  minHeight: 76 * unit,
                  padding: 8 * unit,
                  gap: 6 * unit,
                }}
              >
                <View
                  className="items-center justify-center rounded-full bg-ice"
                  style={{ width: 24 * unit, height: 24 * unit }}
                >
                  <Text
                    className="font-medium text-brand"
                    style={{ fontSize: 12 * unit }}
                  >
                    {index + 1}
                  </Text>
                </View>
                <ReferenceArt
                  region={artRegions[lesson.topic]}
                  width={54 * unit}
                  height={58 * unit}
                />
                <View className="flex-1" style={{ gap: 5 * unit }}>
                  <Text
                    className="font-bold text-ink"
                    style={{ fontSize: 13 * unit, lineHeight: 16 * unit }}
                  >
                    {title}
                  </Text>
                  <View
                    className={expanded ? "gap-1" : "flex-row items-center"}
                    style={{ gap: 6 * unit }}
                  >
                    <View
                      className="self-start rounded-full bg-ice"
                      style={{
                        paddingHorizontal: 8 * unit,
                        paddingVertical: 4 * unit,
                      }}
                    >
                      <Text
                        className="font-medium text-brand"
                        style={{ fontSize: 9 * unit }}
                      >
                        {t("pathPreview.why")}
                      </Text>
                    </View>
                    <View
                      className="flex-1 rounded-lg bg-ice"
                      style={{
                        paddingHorizontal: 7 * unit,
                        paddingVertical: 5 * unit,
                      }}
                    >
                      <Text
                        className="text-ink"
                        style={{ fontSize: 9.5 * unit, lineHeight: 12 * unit }}
                      >
                        {reason}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text
                  accessible={false}
                  className="text-brand"
                  style={{ fontSize: 24 * unit }}
                >
                  ›
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

import React from "react";
import { Txt } from "../components/Txt";
import { Image, Pressable, View } from "react-native";
import { useWindowSize } from "../hooks/use-window-size";
import Svg, { Image as SvgImage, Path } from "react-native-svg";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import {
  ActionBar,
  Button,
  Card,
  KikoNote,
  Progress,
  Screen,
  Title,
} from "../components/ui";
import { KompassLogo } from "../components/KompassLogo";
import { useApp } from "../state/useApp";
import { colors, layout } from "../theme/tokens";
import { usePath } from "../api/path";
import { topics } from "../onboarding/request";

const reference = require("../../assets/path/reference.png");
// How far through onboarding this screen is.
const PATH_PROGRESS = 0.7;
const KIKO_WIDTH = 120;
const KIKO_HEIGHT = 132;
const LESSON_ART_WIDTH = 54;
const LESSON_ART_HEIGHT = 58;
const CHEVRON_SIZE = 24;
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
  const { width, height } = useWindowSize();
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
        <Button
          title={t("tryAgain")}
          accessibilityHint={t("pathPreview.previewHint")}
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
        <ActionBar>
          <Button
            title={t("pathPreview.start")}
            accessibilityHint={t("pathPreview.previewHint")}
            onPress={() => {
              useApp.getState().set({ onboarded: true });
              router.push("/roadmap");
            }}
          />
        </ActionBar>
      }
    >
      <KompassLogo size={36} />
      <View className="h-2">
        <Progress value={PATH_PROGRESS} />
      </View>
      <View className="flex-row items-center">
        <View className="flex-1 gap-2">
          <View>
            <Title>{t("pathPreview.titleLead")}</Title>
            <Txt variant="title" tone="brand">
              {t("pathPreview.titleReady")}
            </Txt>
          </View>
          <Txt variant="small" tone="brand">
            {t("pathPreview.intro")}
          </Txt>
        </View>
        <Image
          source={require("../../assets/challenges/kiko-happy-transparent.png")}
          resizeMode="contain"
          accessible={false}
          style={{ width: KIKO_WIDTH * unit, height: KIKO_HEIGHT * unit }}
        />
      </View>
      <View style={{ gap: layout.itemGap }}>
        <Txt accessibilityRole="header" variant="subheading">
          {t("pathPreview.lessons")}
        </Txt>
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
            >
              <Card style={{ flexDirection: "row", alignItems: "center" }}>
                <ReferenceArt
                  region={artRegions[lesson.topic]}
                  width={LESSON_ART_WIDTH}
                  height={LESSON_ART_HEIGHT}
                />
                <View className="flex-1 gap-1">
                  <Txt variant="subheading">
                    {index + 1}. {title}
                  </Txt>
                  <Txt variant="caption" tone="brand" weight="bold">
                    {t("pathPreview.why")}
                  </Txt>
                  <Txt variant="small">{reason}</Txt>
                </View>
                <Feather
                  name="chevron-right"
                  size={CHEVRON_SIZE}
                  color={colors.deepBlue}
                />
              </Card>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

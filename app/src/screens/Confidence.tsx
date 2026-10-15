import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { KikoNote, Screen, Txt, Progress } from "../components/ui";
import { useApp } from "../state/useApp";
import { colors } from "../theme/tokens";
import { topics } from "../onboarding/request";
import { KompassLogo } from "../components/KompassLogo";

const scenes = {
  US: require("../../assets/welcome/us.png"),
  MX: require("../../assets/welcome/mx.png"),
  KE: require("../../assets/welcome/ke.png"),
};
const CONFIDENCE_MIN = 1;
const CONFIDENCE_MAX = 5;
const CONFIDENCE_RANGE = CONFIDENCE_MAX - CONFIDENCE_MIN;
const CONFIDENCE_STEPS = [1, 2, 3, 4, 5];
const icons = ["🏛️", "🐖", "💳", "🛡️", "👛"];

/** Third onboarding screen, with persisted confidence for each money skill. */
export function Confidence() {
  const country = useApp((state) => state.country);
  const confidence = useApp((state) => state.confidence);
  const { t } = useTranslation();
  return (
    <Screen
      background={
        <Image
          source={scenes[country]}
          resizeMode="cover"
          className="absolute h-full w-full opacity-20"
          accessible={false}
        />
      }
    >
      <View className="flex-row items-center justify-between">
        <KompassLogo size={36} />
      </View>
      <View className="h-2">
        <Progress value={1} />
      </View>
      <View className="gap-2">
        <Txt className="font-bold uppercase tracking-widest text-ink">
          {t("confidence")}
        </Txt>
        <Txt accessibilityRole="header" className="text-3xl font-bold text-ink">
          {t("confident")}
        </Txt>
      </View>
      <KikoNote message={t("noWrong")} />
      <View className="gap-3">
        {topics.map((topic, index) => (
          <View
            key={topic}
            className="mx-2 flex-row items-center gap-3 rounded-3xl bg-white p-4"
          >
            <Txt accessible={false} className="text-4xl">
              {icons[index]}
            </Txt>
            <View className="flex-1">
              <Txt className="font-bold text-ink">
                {t(`confidenceTopics.${topic}`)}
              </Txt>
              <View className="relative">
                <Slider
                  minimumValue={CONFIDENCE_MIN}
                  maximumValue={CONFIDENCE_MAX}
                  step={1}
                  value={
                    Math.round(confidence[index] * CONFIDENCE_RANGE) +
                    CONFIDENCE_MIN
                  }
                  accessibilityRole="adjustable"
                  accessibilityLabel={t(`confidenceTopics.${topic}`)}
                  accessibilityHint={t("sliderHint")}
                  accessibilityValue={{
                    min: CONFIDENCE_MIN,
                    max: CONFIDENCE_MAX,
                    now:
                      Math.round(confidence[index] * CONFIDENCE_RANGE) +
                      CONFIDENCE_MIN,
                  }}
                  onValueChange={(value) =>
                    useApp.getState().set({
                      confidence: useApp
                        .getState()
                        .confidence.map((previous, position) =>
                          position === index
                            ? (value - CONFIDENCE_MIN) / CONFIDENCE_RANGE
                            : previous,
                        ),
                    })
                  }
                  minimumTrackTintColor={colors.brightBlue}
                  maximumTrackTintColor={colors.lightBlue}
                  thumbTintColor={colors.deepBlue}
                  style={{ height: 44 }}
                />
                <View
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                  pointerEvents="none"
                  className="absolute inset-x-3 top-[18px] flex-row justify-between"
                >
                  {CONFIDENCE_STEPS.map((rating) => (
                    <View key={rating} className="items-center">
                      <View className="h-2 w-px bg-brand" />
                    </View>
                  ))}
                </View>
              </View>
              <View className="flex-row justify-between gap-2">
                <Txt className="flex-1 text-xs">{t("notConfident")}</Txt>
                <Txt className="flex-1 text-right text-xs">
                  {t("veryConfident")}
                </Txt>
              </View>
            </View>
          </View>
        ))}
      </View>
      <Action
        title={t("quizBegin")}
        hint={t("quizStartHint")}
        onPress={() => router.push("/quiz")}
      />
      <Action
        title={t("build")}
        hint={t("pathPreview.previewHint")}
        onPress={() => router.push("/path")}
      />
    </Screen>
  );
}

/** Accessible onboarding action using the shared brand palette. */
export function Action({
  title,
  hint,
  onPress,
  disabled = false,
}: {
  title: string;
  hint: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className="min-h-16 items-center justify-center rounded-2xl bg-brand p-4"
    >
      <Text className="text-center text-lg font-bold text-white">{title}</Text>
    </Pressable>
  );
}

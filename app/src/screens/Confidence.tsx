import React from "react";
import { SCENERY_FILL } from "../components/AppScenery";
import { Image, View } from "react-native";
import Slider from "@react-native-community/slider";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActionBar,
  Button,
  Card,
  KikoNote,
  Label,
  Progress,
  Screen,
  Title,
  Txt,
} from "../components/ui";
import { useApp } from "../state/useApp";
import { colors } from "../theme/tokens";
import { topics } from "../onboarding/request";
import { KompassLogo } from "../components/KompassLogo";

// Faint scenery so the sliders stay readable.
const SCENERY_OPACITY = 0.2;

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
          style={[SCENERY_FILL, { opacity: SCENERY_OPACITY }]}
          accessible={false}
        />
      }
      footer={
        <ActionBar>
          <Button
            title={t("quizBegin")}
            accessibilityHint={t("quizStartHint")}
            onPress={() => router.push("/quiz")}
          />
          <Button
            secondary
            title={t("build")}
            accessibilityHint={t("quizStartHint")}
            onPress={() => router.push("/quiz")}
          />
        </ActionBar>
      }
    >
      <View className="flex-row items-center justify-between">
        <KompassLogo size={36} />
      </View>
      <View className="h-2">
        <Progress value={1} />
      </View>
      <View>
        <Label>{t("confidence")}</Label>
        <Title>{t("confident")}</Title>
      </View>
      <KikoNote message={t("noWrong")} />
      <View className="gap-3">
        {topics.map((topic, index) => (
          <Card
            key={topic}
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <Txt accessible={false} variant="title">
              {icons[index]}
            </Txt>
            <View className="flex-1">
              <Txt variant="subheading">{t(`confidenceTopics.${topic}`)}</Txt>
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
                <Txt variant="small" className="flex-1">
                  {t("notConfident")}
                </Txt>
                <Txt variant="small" className="flex-1 text-right">
                  {t("veryConfident")}
                </Txt>
              </View>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

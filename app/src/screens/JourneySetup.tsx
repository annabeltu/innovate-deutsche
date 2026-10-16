import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useApp } from "../state/useApp";
import {
  ActionBar,
  Button,
  Choice,
  OptionRow,
  Progress,
  Screen,
  Title,
  Txt,
} from "../components/ui";
import { KompassLogo } from "../components/KompassLogo";
import { useWindowSize } from "../hooks/use-window-size";
import { toOnboardingRequest } from "../api/learner";
import { alpha, colors, layout } from "../theme/tokens";
import {
  COMFORT_OPTIONS,
  GOAL_OPTIONS,
  LIFE_STAGE_OPTIONS,
} from "../onboarding/options";

const scenes = {
  US: require("../../assets/welcome/us.png"),
  MX: require("../../assets/welcome/mx.png"),
  KE: require("../../assets/welcome/ke.png"),
};
const stageIcons = {
  student: "🎒",
  first_job: "💼",
  parent: "🏡",
  retired: "🏖️🌿",
};
// How far through onboarding this screen is.
const SETUP_PROGRESS = 0.58;
// Two tiles per row, with the item gap between them.
const HALF_ROW = "48%";

/** Scenery behind the setup questions, faded so text stays readable. */
function SetupScenery({ country }: { country: keyof typeof scenes }) {
  return (
    <>
      <Image
        source={scenes[country]}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
        accessible={false}
      />
      <LinearGradient
        colors={[
          alpha(colors.iceBlue, 0.75),
          alpha(colors.white, 0.12),
          country === "KE"
            ? alpha(colors.darkBlue, 0.35)
            : alpha(colors.welcomePanel, 0.45),
        ]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </>
  );
}

/** Onboarding step: life stage, goal and how money feels today. */
export function JourneySetup() {
  const s = useApp();
  const { t } = useTranslation();
  const answers = toOnboardingRequest(s);
  const { width, fontScale } = useWindowSize();
  const stacked = width < 320 || fontScale > 1.5 || s.large;
  return (
    <Screen
      background={<SetupScenery country={s.country} />}
      footer={
        <ActionBar>
          <Button
            title={t("continue")}
            icon="arrow-right"
            onPress={() => router.push("/confidence")}
          />
        </ActionBar>
      }
    >
      <KompassLogo size={36} />
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: SETUP_PROGRESS * 100 }}
        className="h-2"
      >
        <Progress value={SETUP_PROGRESS} />
      </View>
      <View>
        <Title>{t("where")}</Title>
        <Txt variant="title" style={{ color: colors.midBlue }}>
          {t("now")}
        </Txt>
      </View>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: layout.itemGap,
        }}
      >
        {LIFE_STAGE_OPTIONS.map((option) => (
          <Choice
            key={option.id}
            title={t(option.labelKey)}
            icon={stageIcons[option.id]}
            accessibilityHint={t(option.helperKey)}
            selected={answers.life_stage === option.id}
            onPress={() => s.set({ stage: option.id })}
            style={{ width: stacked ? "100%" : HALF_ROW }}
          />
        ))}
      </View>
      <View style={{ gap: layout.itemGap }}>
        <Txt accessibilityRole="header" variant="heading">
          {t("goals")}
        </Txt>
        {GOAL_OPTIONS.map((option) => (
          <OptionRow
            key={option.id}
            title={t(option.labelKey)}
            accessibilityHint={t(option.helperKey)}
            selected={answers.goal === option.id}
            onPress={() => s.set({ goal: option.id })}
          />
        ))}
      </View>
      <View style={{ gap: layout.itemGap }}>
        <Txt accessibilityRole="header" variant="heading">
          {t("feels")}
        </Txt>
        {COMFORT_OPTIONS.map((option, index) => (
          <OptionRow
            key={option.id}
            title={t(option.labelKey)}
            accessibilityHint={t(option.helperKey)}
            selected={answers.comfort === index + 1}
            onPress={() =>
              s.set({ comfort: index / (COMFORT_OPTIONS.length - 1) })
            }
          />
        ))}
      </View>
    </Screen>
  );
}

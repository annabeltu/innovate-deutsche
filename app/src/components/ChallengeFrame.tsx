import React from "react";
import { SCENERY_FILL } from "./AppScenery";
import { Image, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActionBar, Button, Screen, Progress } from "./ui";
import { ChallengeArt } from "./ChallengeArt";
import { useApp } from "../state/useApp";
import { personalizePath } from "../onboarding/personalized-path";
import { KompassLogo } from "./KompassLogo";

// Soft scenery behind the challenge card.
const SCENERY_OPACITY = 0.4;

const scenes = {
  US: require("../../assets/welcome/us.png"),
  MX: require("../../assets/welcome/mx.png"),
  KE: require("../../assets/welcome/ke.png"),
};

/** Shared challenge chrome, explicit narration, country scenery and fixed action. */
export function ChallengeFrame({
  kind,
  narration,
  children,
  onCheck,
  disabled = false,
}: {
  kind: "budget" | "scam";
  narration: string;
  children: React.ReactNode;
  onCheck?: () => void;
  disabled?: boolean;
}) {
  const country = useApp((state) => state.country);
  const confidence = useApp((state) => state.confidence);
  const hearts = useApp((state) => state.hearts);
  const { t } = useTranslation();
  const position =
    personalizePath(confidence).findIndex(
      (lesson) => lesson.topic === (kind === "budget" ? "budget" : "scams"),
    ) + 1;
  return (
    <Screen
      compact
      background={
        <Image
          source={scenes[country]}
          resizeMode="cover"
          style={[SCENERY_FILL, { opacity: SCENERY_OPACITY }]}
          accessible={false}
        />
      }
      footer={
        onCheck && (
          <ActionBar>
            <Button
              title={t("check")}
              accessibilityHint={t("challenge.checkHint")}
              disabled={disabled}
              onPress={onCheck}
            />
          </ActionBar>
        )
      }
    >
      <View className="flex-row items-center justify-between">
        <KompassLogo size={30} />
        <Text
          accessibilityLabel={t("roadmapScreen.hearts", { count: hearts })}
          className="rounded-2xl bg-white px-3 py-2 font-bold text-ink"
        >
          ♥️ {hearts}
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        <View className="h-2 flex-1">
          <Progress value={position / 5} />
        </View>
        <Text
          accessibilityLabel={t("challenge.position", {
            number: position,
            total: 5,
          })}
          className="rounded-xl bg-ice px-3 py-2 font-bold text-brand"
        >
          {position} / 5
        </Text>
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-ink">{t("challenge.unit")}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("quizBack")}
          accessibilityHint={t("challenge.backHint")}
          onPress={() => router.replace("/roadmap")}
          className="min-h-11 min-w-11 items-center justify-center rounded-full bg-white"
        >
          <Text className="text-xl text-brand">‹</Text>
        </Pressable>
      </View>
      <View className="flex-row items-center gap-2">
        <View className="flex-1 gap-2">
          <Text
            accessibilityRole="header"
            className="text-3xl font-bold text-ink"
          >
            {t(`challenge.${kind}Title`)}
          </Text>
          <Text className="text-sm leading-5 text-brand">
            {t(`challenge.${kind}Intro`)}
          </Text>
        </View>
        <ChallengeArt kind={kind} size={100} />
      </View>
      <View accessible={false} accessibilityLabel={narration} className="gap-3">
        {children}
      </View>
    </Screen>
  );
}

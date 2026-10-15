import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useEffect } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import * as Speech from "expo-speech";
import { useTranslation } from "react-i18next";
import { Action } from "../screens/Confidence";
import { ChallengeArt } from "./ChallengeArt";
import { useApp } from "../state/useApp";

/** Accessible success sheet; repeated completions never claim a second coin reward. */
export function ChallengeSuccess({
  kind,
  reward,
}: {
  kind: "budget" | "scam" | "transfer";
  reward: number;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const readAloud = useApp((state) => state.readAloud);
  const language = useApp((state) => state.language);
  const finish = () => router.replace("/roadmap");
  const explanation = t(`challenge.${kind}Success`);
  const tip = t(`challenge.${kind}Tip`);
  const coinText =
    reward > 0
      ? t("challenge.reward", { count: reward })
      : t("challenge.replayed");
  useEffect(() => {
    if (readAloud) {
      void Speech.stop();
      Speech.speak(
        `${t("challenge.nice")}. ${coinText}. ${explanation}. ${tip}. ${t("continue")}.`,
        { language },
      );
    }
    return () => {
      void Speech.stop();
    };
  }, [readAloud, language, t, coinText, explanation, tip]);
  return (
    <Modal transparent visible animationType="none" onRequestClose={finish}>
      <View className="flex-1 justify-end bg-ink/60">
        <View
          accessibilityViewIsModal
          style={{
            paddingBottom: 28 + insets.bottom,
            paddingLeft: 20 + insets.left,
            paddingRight: 20 + insets.right,
          }}
          className={`max-h-[85%] w-full self-center rounded-t-3xl px-5 pb-7 pt-3 ${kind !== "scam" ? "bg-positiveSurface" : "bg-warning"}`}
        >
          <View className="mb-4 h-1 w-10 self-center rounded-full bg-ice" />
          <ScrollView contentContainerClassName="gap-4">
            <View className="flex-row items-center">
              <View className="flex-1 gap-2">
                <Text
                  accessibilityRole="header"
                  className={
                    kind !== "scam"
                      ? "text-5xl font-bold text-positive"
                      : "text-2xl font-bold text-danger"
                  }
                >
                  {t(
                    kind !== "scam"
                      ? "challenge.nice"
                      : "challenge.scamHeading",
                  )}
                </Text>
                <Text className="text-3xl font-bold text-ink">{coinText}</Text>
                <Text className="text-base leading-6 text-ink">
                  {explanation}
                </Text>
              </View>
              <ChallengeArt
                kind={kind !== "scam" ? "success" : "scamSuccess"}
                size={kind !== "scam" ? 145 : 100}
              />
            </View>
            {kind === "scam" && (
              <View className="gap-2">
                <Text className="font-bold text-ink">
                  {t("challenge.redFlags")}
                </Text>
                {["flagUrgency", "flagPin", "flagLink"].map((key) => (
                  <View
                    key={key}
                    className="flex-row items-center gap-2 rounded-xl bg-white p-3"
                  >
                    <Text accessible={false} className="font-bold text-danger">
                      !
                    </Text>
                    <Text className="flex-1 text-sm text-ink">
                      {t(`challenge.${key}`)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <View className="flex-row gap-3 rounded-2xl bg-white p-4">
              <Text accessible={false} className="text-3xl">
                💡
              </Text>
              <View className="flex-1 gap-1">
                <Text className="font-bold text-brand">
                  {t("challenge.tip")}
                </Text>
                <Text className="text-sm leading-5 text-ink">{tip}</Text>
              </View>
            </View>
            <Action
              title={t("continue")}
              hint={t("challenge.backHint")}
              onPress={finish}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

import { ChallengeArt } from "../components/ChallengeArt";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ChallengeFrame } from "../components/ChallengeFrame";
import { ChallengeSuccess } from "../components/ChallengeSuccess";
import { useApp } from "../state/useApp";

/** Practice identifying an urgent PIN request without opening any real link. */
export function ScamChallenge() {
  const { t } = useTranslation();
  const [error, setError] = useState(false);
  const [reward, setReward] = useState<number | null>(null);
  const narration = `${t("challenge.messageStart")} ${t("challenge.messagePin")} ${t("challenge.messageLink")} ${t("challenge.messageEnd")}. ${t("challenge.scamHelp")}`;
  const answer = (choice: "scam" | "legit") => {
    if (reward !== null) return;
    if (choice === "legit") {
      setError(true);
      return;
    }
    const before = useApp.getState().coins;
    useApp.getState().complete("scams");
    setReward(useApp.getState().coins - before);
  };
  return (
    <>
      <View
        className="flex-1"
        importantForAccessibility={
          reward !== null ? "no-hide-descendants" : "auto"
        }
        accessibilityElementsHidden={reward !== null}
      >
        <ChallengeFrame kind="scam" narration={narration}>
          <View className="overflow-hidden rounded-3xl bg-white">
            <View className="items-center gap-1 bg-ice p-3">
              <Text accessible={false} className="text-3xl">
                👤
              </Text>
              <Text className="text-sm font-bold text-ink">
                {t("challenge.sender")}
              </Text>
            </View>
            <Text className="py-3 text-center text-xs text-ink">
              {t("challenge.exampleMessage")}
            </Text>
            <View className="mx-4 mb-4 gap-3 rounded-3xl bg-ice p-4">
              <Text className="text-lg leading-7 text-ink">
                <Text className="bg-warning font-bold">
                  {t("challenge.messageStart")}
                </Text>
                {"\n"}
                <Text className="bg-warning font-bold">
                  {t("challenge.messagePin")}
                </Text>
                {"\n"}
                <Text className="text-brand underline">
                  {t("challenge.messageLink")}
                </Text>
              </Text>
              <Text className="text-lg leading-7 text-ink">
                {t("challenge.messageEnd")}
              </Text>
            </View>
          </View>
          <View className="flex-row gap-3">
            {(["scam", "legit"] as const).map((choice) => (
              <Pressable
                key={choice}
                accessibilityRole="button"
                accessibilityLabel={t(`challenge.${choice}`)}
                accessibilityHint={t("challenge.answerHint")}
                disabled={reward !== null}
                onPress={() => answer(choice)}
                className={`min-h-16 flex-1 items-center justify-center rounded-3xl border-2 p-3 ${choice === "scam" ? "border-danger bg-warning" : "border-positive bg-positiveSurface"}`}
              >
                <Text
                  className={`text-2xl font-bold ${choice === "scam" ? "text-danger" : "text-positive"}`}
                >
                  {choice === "scam" ? "🚩 " : "✓ "}
                  {t(`challenge.${choice}`)}
                </Text>
              </Pressable>
            ))}
          </View>
          {error && (
            <View
              accessibilityRole="alert"
              className="flex-row items-center gap-2 rounded-2xl bg-white p-4"
            >
              <View className="flex-1 gap-2">
                <Text className="font-bold text-danger">
                  {t("challenge.tryAgain")}
                </Text>
                <Text className="text-sm text-ink">
                  {t("challenge.scamError")}
                </Text>
              </View>
              <ChallengeArt kind="scam" size={80} />
            </View>
          )}
          <Text className="text-xs text-ink">{t("challenge.scamHelp")}</Text>
        </ChallengeFrame>
      </View>
      {reward !== null && <ChallengeSuccess kind="scam" reward={reward} />}
    </>
  );
}

import { ChallengeArt } from "../components/ChallengeArt";
import { Txt } from "../components/Txt";
import React, { useState } from "react";
import { View } from "react-native";
import { OptionRow } from "../components/ui";
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
              <Txt accessible={false} variant="title">
                👤
              </Txt>
              <Txt variant="small" weight="bold">
                {t("challenge.sender")}
              </Txt>
            </View>
            <Txt variant="caption" className="py-3 text-center">
              {t("challenge.exampleMessage")}
            </Txt>
            <View className="mx-4 mb-4 gap-3 rounded-3xl bg-ice p-4">
              <Txt variant="subheading" weight="regular">
                <Txt weight="bold" className="bg-warning">
                  {t("challenge.messageStart")}
                </Txt>
                {"\n"}
                <Txt weight="bold" className="bg-warning">
                  {t("challenge.messagePin")}
                </Txt>
                {"\n"}
                <Txt tone="brand" className="underline">
                  {t("challenge.messageLink")}
                </Txt>
              </Txt>
              <Txt variant="subheading" weight="regular">
                {t("challenge.messageEnd")}
              </Txt>
            </View>
          </View>
          <View className="flex-row gap-3">
            {(["scam", "legit"] as const).map((choice) => (
              <View key={choice} className="flex-1">
                <OptionRow
                  accessibilityRole="button"
                  title={`${choice === "scam" ? "🚩" : "✓"} ${t(`challenge.${choice}`)}`}
                  accessibilityLabel={t(`challenge.${choice}`)}
                  accessibilityHint={t("challenge.answerHint")}
                  tone={choice === "scam" ? "danger" : "positive"}
                  centered
                  disabled={reward !== null}
                  onPress={() => answer(choice)}
                />
              </View>
            ))}
          </View>
          {error && (
            <View
              accessibilityRole="alert"
              className="flex-row items-center gap-2 rounded-2xl bg-white p-4"
            >
              <View className="flex-1 gap-2">
                <Txt tone="danger" weight="bold">
                  {t("challenge.tryAgain")}
                </Txt>
                <Txt variant="small">{t("challenge.scamError")}</Txt>
              </View>
              <ChallengeArt kind="scam" size={80} />
            </View>
          )}
          <Txt variant="caption">{t("challenge.scamHelp")}</Txt>
        </ChallengeFrame>
      </View>
      {reward !== null && <ChallengeSuccess kind="scam" reward={reward} />}
    </>
  );
}

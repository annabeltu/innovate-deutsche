import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Txt } from "./Txt";
import React, { useEffect } from "react";
import { Modal, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ChallengeArt } from "./ChallengeArt";
import { Button } from "./ui";
import { useApp } from "../state/useApp";
import { stopSpeaking } from "../voice/speech";
import { useNarration } from "../voice/narration";
import { ReadAloudBubble } from "./ReadAloudBubble";

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
  const finish = () => router.replace("/roadmap");
  const explanation = t(`challenge.${kind}Success`);
  const tip = t(`challenge.${kind}Tip`);
  const coinText =
    reward > 0
      ? t("challenge.reward", { count: reward })
      : t("challenge.replayed");
  useEffect(() => {
    const narration = `${t("challenge.nice")}. ${coinText}. ${explanation}. ${tip}. ${t("continue")}.`;
    useNarration.getState().setText(narration);
    return stopSpeaking;
  }, [t, coinText, explanation, tip]);
  return (
    <Modal transparent visible animationType="none" onRequestClose={finish}>
      <View className="flex-1 justify-end bg-ink/60">
        {/* The pop-up hides the screen's bubble, so it floats its own over the
            dimmed backdrop, where it covers nothing. */}
        {readAloud && (
          <View
            style={{
              position: "absolute",
              top: insets.top + 16,
              right: insets.right + 16,
            }}
          >
            <ReadAloudBubble />
          </View>
        )}
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
                <Txt
                  accessibilityRole="header"
                  variant={kind !== "scam" ? "title" : "heading"}
                  tone={kind !== "scam" ? "positive" : "danger"}
                  weight="bold"
                >
                  {t(
                    kind !== "scam"
                      ? "challenge.nice"
                      : "challenge.scamHeading",
                  )}
                </Txt>
                <Txt variant="title">{coinText}</Txt>
                <Txt>{explanation}</Txt>
              </View>
              <ChallengeArt
                kind={kind !== "scam" ? "success" : "scamSuccess"}
                size={kind !== "scam" ? 145 : 100}
              />
            </View>
            {kind === "scam" && (
              <View className="gap-2">
                <Txt weight="bold">{t("challenge.redFlags")}</Txt>
                {["flagUrgency", "flagPin", "flagLink"].map((key) => (
                  <View
                    key={key}
                    className="flex-row items-center gap-2 rounded-xl bg-white p-3"
                  >
                    <Txt accessible={false} tone="danger" weight="bold">
                      !
                    </Txt>
                    <Txt variant="small" className="flex-1">
                      {t(`challenge.${key}`)}
                    </Txt>
                  </View>
                ))}
              </View>
            )}
            <View className="flex-row gap-3 rounded-2xl bg-white p-4">
              <Txt accessible={false} variant="title">
                💡
              </Txt>
              <View className="flex-1 gap-1">
                <Txt tone="brand" weight="bold">
                  {t("challenge.tip")}
                </Txt>
                <Txt variant="small">{tip}</Txt>
              </View>
            </View>
            <Button
              title={t("continue")}
              accessibilityHint={t("challenge.backHint")}
              onPress={finish}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

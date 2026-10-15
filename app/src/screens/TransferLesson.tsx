import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Screen } from "../components/ui";
import { AppScenery } from "../components/AppScenery";
import { AccountHeader } from "../components/AccountHeader";
import { KikoAvatar } from "../components/KikoAvatar";
import { ChallengeSuccess } from "../components/ChallengeSuccess";
import { Action } from "./Confidence";
import { useApp } from "../state/useApp";

/** Pre-written transfer lesson unlocked by the sample conversation or the shop. */
export function TransferLesson({ id }: { id: string }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState("");
  const [error, setError] = useState(false);
  const [reward, setReward] = useState<number | null>(null);
  const check = () => {
    if (reward !== null) return;
    if (selected !== "a") {
      setError(true);
      return;
    }
    const before = useApp.getState().coins;
    useApp.getState().complete(id);
    setReward(useApp.getState().coins - before);
  };
  return (
    <>
      <View
        className="flex-1"
        accessibilityElementsHidden={reward !== null}
        importantForAccessibility={
          reward !== null ? "no-hide-descendants" : "auto"
        }
      >
        <Screen
          compact
          background={<AppScenery />}
          footer={
            <View className="px-5 pb-4 pt-2">
              <Action
                title={t("check")}
                hint={t("quizNextHint")}
                disabled={!selected || reward !== null}
                onPress={check}
              />
            </View>
          }
        >
          <AccountHeader />
          <View className="flex-row items-center gap-3">
            <View className="flex-1 gap-2">
              <Text className="text-xs font-bold text-brand">
                {t("roadmapScreen.bonus")}
              </Text>
              <Text
                accessibilityRole="header"
                className="text-3xl font-bold text-ink"
              >
                {t("shopScreen.transferTitle")}
              </Text>
            </View>
            <KikoAvatar size={100} />
          </View>
          <Text className="rounded-3xl bg-white p-5 text-base leading-6 text-ink">
            {t("askScreen.exampleAnswer")}
          </Text>
          <Text className="text-xl font-bold text-ink">
            {t("experience.transferQuestion")}
          </Text>
          {(["a", "b"] as const).map((option) => (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityLabel={`${option.toUpperCase()}. ${t(`experience.transfer${option.toUpperCase()}`)}`}
              accessibilityHint={t("quizOptionHint")}
              accessibilityState={{ checked: selected === option }}
              onPress={() => {
                setSelected(option);
                setError(false);
              }}
              className={`min-h-16 rounded-2xl border-2 p-4 ${selected === option ? "border-brand bg-ice" : "border-transparent bg-white"}`}
            >
              <Text className="text-base text-ink">
                {option.toUpperCase()}.{" "}
                {t(`experience.transfer${option.toUpperCase()}`)}
              </Text>
            </Pressable>
          ))}
          {error && (
            <Text
              accessibilityRole="alert"
              className="rounded-2xl bg-white p-4 text-danger"
            >
              {t("experience.transferRetry")}
            </Text>
          )}
        </Screen>
      </View>
      {reward !== null && <ChallengeSuccess kind="transfer" reward={reward} />}
    </>
  );
}

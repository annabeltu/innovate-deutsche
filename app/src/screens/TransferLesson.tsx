import React, { useState } from "react";
import { Txt } from "../components/Txt";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { ActionBar, Button, OptionRow, Screen } from "../components/ui";
import { AppScenery } from "../components/AppScenery";
import { AccountHeader } from "../components/AccountHeader";
import { KikoAvatar } from "../components/KikoAvatar";
import { ChallengeSuccess } from "../components/ChallengeSuccess";
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
            <ActionBar>
              <Button
                title={t("check")}
                accessibilityHint={t("quizNextHint")}
                disabled={!selected || reward !== null}
                onPress={check}
              />
            </ActionBar>
          }
        >
          <AccountHeader />
          <View className="flex-row items-center gap-3">
            <View className="flex-1 gap-2">
              <Txt variant="caption" tone="brand" weight="bold">
                {t("roadmapScreen.bonus")}
              </Txt>
              <Txt accessibilityRole="header" variant="title">
                {t("shopScreen.transferTitle")}
              </Txt>
            </View>
            <KikoAvatar size={100} />
          </View>
          <Txt className="rounded-3xl bg-white p-5">
            {t("askScreen.exampleAnswer")}
          </Txt>
          <Txt variant="heading" weight="bold">
            {t("experience.transferQuestion")}
          </Txt>
          {(["a", "b"] as const).map((option) => (
            <OptionRow
              key={option}
              letter={option.toUpperCase()}
              title={t(`experience.transfer${option.toUpperCase()}`)}
              accessibilityLabel={`${option.toUpperCase()}. ${t(`experience.transfer${option.toUpperCase()}`)}`}
              accessibilityHint={t("quizOptionHint")}
              selected={selected === option}
              onPress={() => {
                setSelected(option);
                setError(false);
              }}
            />
          ))}
          {error && (
            <Txt
              accessibilityRole="alert"
              tone="danger"
              className="rounded-2xl bg-white p-4"
            >
              {t("experience.transferRetry")}
            </Txt>
          )}
        </Screen>
      </View>
      {reward !== null && <ChallengeSuccess kind="transfer" reward={reward} />}
    </>
  );
}

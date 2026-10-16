import { BudgetCategoryArt, ChallengeArt } from "../components/ChallengeArt";
import { Txt } from "../components/Txt";
import React, { useState } from "react";
import { View } from "react-native";
import Slider from "@react-native-community/slider";
import { useTranslation } from "react-i18next";
import { ChallengeFrame } from "../components/ChallengeFrame";
import { ChallengeSuccess } from "../components/ChallengeSuccess";
import { useApp } from "../state/useApp";
import { colors } from "../theme/tokens";
import {
  budgetCategories,
  budgetRemaining,
  budgetScenario,
  formatMoney,
  isBudgetCorrect,
} from "../lessons/budget";

/** Interactive budget simulation that accounts for an unexpected repair. */
export function BudgetChallenge() {
  const country = useApp((state) => state.country);
  const language = useApp((state) => state.language);
  const { t } = useTranslation();
  const scenario = budgetScenario(country);
  const [allocation, setAllocation] = useState(scenario.allocation);
  const [error, setError] = useState(false);
  const [reward, setReward] = useState<number | null>(null);
  const money = (amount: number) => formatMoney(country, language, amount);
  const remaining = budgetRemaining(country, allocation);
  const narration = [
    t("challenge.income"),
    money(scenario.income),
    t("challenge.surpriseText", { amount: money(scenario.repair) }),
    ...budgetCategories.map(
      (category) =>
        `${t(`challenge.${category}`)}: ${money(allocation[category])}. ${t("challenge.minimum", { amount: money(scenario.minimums[category]) })}`,
    ),
    t("challenge.remaining", { amount: money(remaining) }),
    t("challenge.budgetHelp"),
  ].join(". ");
  const check = () => {
    if (reward !== null) return;
    if (!isBudgetCorrect(country, allocation)) {
      setError(true);
      return;
    }
    const before = useApp.getState().coins;
    useApp.getState().complete("budget");
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
        <ChallengeFrame
          kind="budget"
          narration={narration}
          onCheck={check}
          disabled={reward !== null}
        >
          <View className="gap-1 rounded-3xl bg-white p-3">
            <View className="mb-1 flex-row items-center gap-3">
              <Txt accessible={false} variant="title">
                💵
              </Txt>
              <View>
                <Txt weight="bold">{t("challenge.income")}</Txt>
                <Txt variant="title">{money(scenario.income)}</Txt>
              </View>
            </View>
            {budgetCategories.map((category) => (
              <View
                key={category}
                className="flex-row items-center gap-2 rounded-xl bg-ice px-1"
              >
                <BudgetCategoryArt category={category} />
                <View className="w-20">
                  <Txt variant="caption" weight="semibold">
                    {t(`challenge.${category}`)}
                  </Txt>
                  <Txt className="text-[10px]">
                    {t("challenge.minimum", {
                      amount: money(scenario.minimums[category]),
                    })}
                  </Txt>
                </View>
                <Slider
                  accessibilityRole="adjustable"
                  accessibilityLabel={t(`challenge.${category}`)}
                  accessibilityHint={t("challenge.budgetSliderHint")}
                  accessibilityValue={{
                    min: scenario.minimums[category],
                    max: scenario.income,
                    now: allocation[category],
                    text: money(allocation[category]),
                  }}
                  minimumValue={scenario.minimums[category]}
                  maximumValue={scenario.income}
                  step={scenario.step}
                  value={allocation[category]}
                  onValueChange={(value) => {
                    setAllocation((previous) => ({
                      ...previous,
                      [category]: Math.round(value),
                    }));
                    setError(false);
                  }}
                  minimumTrackTintColor={colors.brightBlue}
                  maximumTrackTintColor={colors.lightBlue}
                  thumbTintColor={colors.deepBlue}
                  style={{ flex: 1, height: 44 }}
                />
                <Txt
                  variant="caption"
                  weight="bold"
                  className="w-14 text-right"
                >
                  {money(allocation[category])}
                </Txt>
              </View>
            ))}
          </View>
          <View className="gap-1 rounded-2xl bg-warning p-4">
            <Txt variant="heading" tone="danger" weight="bold">
              {t("challenge.surprise")}
            </Txt>
            <Txt weight="bold">
              {t("challenge.surpriseText", { amount: money(scenario.repair) })}
            </Txt>
            <Txt variant="small">{t("challenge.budgetHelp")}</Txt>
          </View>
          <Txt
            accessibilityLiveRegion="polite"
            weight="bold"
            className="rounded-xl bg-white p-3 text-center"
          >
            {t("challenge.remaining", { amount: money(remaining) })}
          </Txt>
          {error && (
            <View
              accessibilityRole="alert"
              className="flex-row items-center gap-2 rounded-xl bg-white p-3"
            >
              <Txt variant="small" tone="danger" className="flex-1">
                {t("challenge.budgetError")}
              </Txt>
              <ChallengeArt kind="scam" size={80} />
            </View>
          )}
          <Txt variant="caption">{t("challenge.synthetic")}</Txt>
        </ChallengeFrame>
      </View>
      {reward !== null && <ChallengeSuccess kind="budget" reward={reward} />}
    </>
  );
}

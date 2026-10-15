import { BudgetCategoryArt, ChallengeArt } from "../components/ChallengeArt";
import React, { useState } from "react";
import { Text, View } from "react-native";
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
              <Text accessible={false} className="text-3xl">
                💵
              </Text>
              <View>
                <Text className="font-bold text-ink">
                  {t("challenge.income")}
                </Text>
                <Text className="text-3xl font-bold text-ink">
                  {money(scenario.income)}
                </Text>
              </View>
            </View>
            {budgetCategories.map((category) => (
              <View
                key={category}
                className="flex-row items-center gap-2 rounded-xl bg-ice px-1"
              >
                <BudgetCategoryArt category={category} />
                <View className="w-20">
                  <Text className="text-xs font-semibold text-ink">
                    {t(`challenge.${category}`)}
                  </Text>
                  <Text className="text-[10px] text-ink">
                    {t("challenge.minimum", {
                      amount: money(scenario.minimums[category]),
                    })}
                  </Text>
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
                <Text className="w-14 text-right text-xs font-bold text-ink">
                  {money(allocation[category])}
                </Text>
              </View>
            ))}
          </View>
          <View className="gap-1 rounded-2xl bg-warning p-4">
            <Text className="text-xl font-bold text-danger">
              {t("challenge.surprise")}
            </Text>
            <Text className="font-bold text-ink">
              {t("challenge.surpriseText", { amount: money(scenario.repair) })}
            </Text>
            <Text className="text-sm text-ink">
              {t("challenge.budgetHelp")}
            </Text>
          </View>
          <Text
            accessibilityLiveRegion="polite"
            className="rounded-xl bg-white p-3 text-center font-bold text-ink"
          >
            {t("challenge.remaining", { amount: money(remaining) })}
          </Text>
          {error && (
            <View
              accessibilityRole="alert"
              className="flex-row items-center gap-2 rounded-xl bg-white p-3"
            >
              <Text className="flex-1 text-sm text-danger">
                {t("challenge.budgetError")}
              </Text>
              <ChallengeArt kind="scam" size={80} />
            </View>
          )}
          <Text className="text-xs text-ink">{t("challenge.synthetic")}</Text>
        </ChallengeFrame>
      </View>
      {reward !== null && <ChallengeSuccess kind="budget" reward={reward} />}
    </>
  );
}

import React from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useApp } from "../state/useApp";

/** Shared Kompass identity and real learner balances. */
export function AccountHeader({
  dark = false,
  showHearts = true,
}: {
  dark?: boolean;
  showHearts?: boolean;
}) {
  const coins = useApp((state) => state.coins);
  const hearts = useApp((state) => state.hearts);
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center justify-between gap-2">
      <View accessibilityRole="header">
        <Text
          className={`text-xs font-bold ${dark ? "text-white" : "text-brand"}`}
        >
          Deutsche Bank
        </Text>
        <Text
          className={`text-2xl font-extrabold ${dark ? "text-white" : "text-brand"}`}
        >
          K◉mpass
        </Text>
      </View>
      <View className="flex-row gap-2">
        <Text
          accessibilityLabel={t("roadmapScreen.coins", { count: coins })}
          className="rounded-full bg-white px-3 py-2 text-sm font-bold text-ink"
        >
          🪙 {coins}
        </Text>
        {showHearts && (
          <Text
            accessibilityLabel={t("roadmapScreen.hearts", { count: hearts })}
            className="rounded-full bg-white px-3 py-2 text-sm font-bold text-ink"
          >
            ♥️ {hearts}
          </Text>
        )}
      </View>
    </View>
  );
}

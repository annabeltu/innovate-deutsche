import React from "react";
import { Txt } from "./Txt";
import { View } from "react-native";
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
        <Txt variant="caption" weight="bold" tone={dark ? "light" : "brand"}>
          Deutsche Bank
        </Txt>
        <Txt
          variant="heading"
          tone={dark ? "light" : "brand"}
          style={{ fontWeight: "800" }}
        >
          K◉mpass
        </Txt>
      </View>
      <View className="flex-row gap-2">
        <Txt
          accessibilityLabel={t("roadmapScreen.coins", { count: coins })}
          variant="small"
          weight="bold"
          className="rounded-full bg-white px-3 py-2"
        >
          🪙 {coins}
        </Txt>
        {showHearts && (
          <Txt
            accessibilityLabel={t("roadmapScreen.hearts", { count: hearts })}
            variant="small"
            weight="bold"
            className="rounded-full bg-white px-3 py-2"
          >
            ♥️ {hearts}
          </Txt>
        )}
      </View>
    </View>
  );
}

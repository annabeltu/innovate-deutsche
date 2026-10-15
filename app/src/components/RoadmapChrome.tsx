import React from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Image as SvgImage } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { colors } from "../theme/tokens";
import type { Topic } from "../types/api";
const illustration = require("../../assets/path/reference.png");
const regions: Record<Topic, string> = {
  accounts: "148 876 126 127",
  saving: "148 701 126 127",
  budget: "148 1061 126 127",
  scams: "142 1234 138 150",
  borrowing: "148 1431 126 127",
};
/** Illustration medallion styled for the lesson’s progress state. */
export function Badge({
  topic,
  status,
  size,
}: {
  topic: Topic;
  status: string;
  size: number;
}) {
  const fill =
    status === "completed"
      ? colors.coinGold
      : status === "current"
        ? colors.brightBlue
        : colors.grey;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false}>
        <Circle
          cx={50}
          cy={50}
          r={48}
          fill={fill}
          stroke={status === "current" ? colors.deepBlue : colors.white}
          strokeWidth={2}
        />
        <Circle
          cx={50}
          cy={50}
          r={43}
          fill="none"
          stroke={colors.white}
          strokeWidth={2}
        />
        {status !== "locked" && (
          <Svg x={18} y={18} width={64} height={64} viewBox={regions[topic]}>
            <SvgImage
              href={illustration}
              x={0}
              y={0}
              width={882}
              height={1783}
            />
          </Svg>
        )}
      </Svg>
      {status === "locked" && (
        <View className="absolute inset-0 items-center justify-center">
          <Feather name="lock" size={size * 0.4} color={colors.darkBlue} />
        </View>
      )}
    </View>
  );
}

/** Persistent navigation matching the roadmap’s rounded bottom bar. */
export function RoadmapNavigation({ active = "path" }: { active?: string }) {
  const { t } = useTranslation();
  const items = [
    ["path", "home", "/roadmap"],
    ["practice", "book-open", "/practice"],
    ["ask", "message-circle", "/ask"],
    ["leagues", "award", "/leagues"],
    ["shop", "shopping-bag", "/shop"],
  ] as const;
  return (
    <View className="flex-row rounded-t-3xl bg-white px-3 pb-3 pt-2">
      {items.map(([name, icon, route]) => (
        <Pressable
          key={name}
          accessibilityRole="tab"
          accessibilityLabel={t(name)}
          accessibilityHint={t("roadmapScreen.navHint", { screen: t(name) })}
          accessibilityState={{ selected: name === active }}
          onPress={() => router.replace(route)}
          className="min-h-14 flex-1 items-center justify-center gap-1"
        >
          <Feather
            name={icon}
            size={24}
            color={name === active ? colors.deepBlue : colors.midBlue}
          />
          <Text
            className={`text-xs font-bold ${name === active ? "text-brand" : "text-ink"}`}
          >
            {t(name)}
          </Text>
          <View
            className={
              name === active ? "h-1 w-10 rounded-full bg-brand" : "h-1 w-10"
            }
          />
        </Pressable>
      ))}
    </View>
  );
}

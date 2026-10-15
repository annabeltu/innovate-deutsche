import React from "react";
import { Image } from "react-native";
import Svg, { Image as SvgImage } from "react-native-svg";

const sources = {
  budget: require("../../assets/challenges/kiko-happy-transparent.png"),
  scam: require("../../assets/challenges/kiko-thoughtful-transparent.png"),
  scamSuccess: require("../../assets/challenges/kiko-happy-transparent.png"),
  success: require("../../assets/challenges/kiko-happy-transparent.png"),
};
/** Transparent Kiko artwork without a screenshot rectangle around the character. */
export function ChallengeArt({
  kind,
  size = 110,
}: {
  kind: keyof typeof sources;
  size?: number;
}) {
  return (
    <Image
      source={sources[kind]}
      resizeMode="contain"
      accessible={false}
      style={{ width: size, height: size }}
    />
  );
}

const categorySource = require("../../assets/challenges/budget-reference.png");
const categoryRegions = {
  rent: "87 678 69 69",
  food: "87 775 69 69",
  transport: "87 872 69 69",
  school: "87 969 69 69",
  saving: "87 1066 69 69",
};

/** Reference illustrations for each editable budget category. */
export function BudgetCategoryArt({
  category,
}: {
  category: keyof typeof categoryRegions;
}) {
  return (
    <Svg
      width={32}
      height={36}
      viewBox={categoryRegions[category]}
      preserveAspectRatio="xMidYMid meet"
      accessible={false}
    >
      <SvgImage href={categorySource} width={883} height={1780} />
    </Svg>
  );
}

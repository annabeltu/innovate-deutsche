import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { alpha, colors } from "../theme/tokens";

const OUTLINE_WIDTH = 1.5;
const SHADE_OPACITY = 0.18;
const SHINE_OPACITY = 0.35;

/**
 * A closed treasure chest for unit rewards: domed lid, gold trim and
 * straps, and a lock plate. Drawn as vectors so it stays crisp and
 * identical on iOS, Android and web.
 */
export function TreasureChest({ size = 64 }: { size?: number }) {
  const outline = {
    stroke: colors.darkBlue,
    strokeWidth: OUTLINE_WIDTH,
    strokeLinejoin: "round" as const,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessible={false}>
      {/* Body */}
      <Rect
        x={7}
        y={30}
        width={50}
        height={26}
        rx={3}
        fill={colors.coinGoldText}
        {...outline}
      />
      <Rect
        x={8}
        y={47}
        width={48}
        height={8}
        rx={2}
        fill={alpha(colors.darkBlue, SHADE_OPACITY)}
      />
      {/* Domed lid */}
      <Path
        d="M7 30V22C7 13 18 8 32 8C46 8 57 13 57 22V30Z"
        fill={colors.coinGoldText}
        {...outline}
      />
      <Path
        d="M13 18C17 13 24 11 32 11"
        stroke={alpha(colors.white, SHINE_OPACITY)}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
      {/* Gold straps over lid and body */}
      <Rect
        x={16}
        y={9.5}
        width={6}
        height={46}
        fill={colors.coinGold}
        {...outline}
      />
      <Rect
        x={42}
        y={9.5}
        width={6}
        height={46}
        fill={colors.coinGold}
        {...outline}
      />
      {/* Rim between lid and body */}
      <Rect
        x={5}
        y={27}
        width={54}
        height={6}
        rx={2}
        fill={colors.coinGold}
        {...outline}
      />
      {/* Lock plate and keyhole */}
      <Rect
        x={26}
        y={29}
        width={12}
        height={14}
        rx={2.5}
        fill={colors.coinGold}
        {...outline}
      />
      <Circle cx={32} cy={35} r={2} fill={colors.darkBlue} />
      <Rect
        x={31.2}
        y={35.5}
        width={1.6}
        height={4}
        rx={0.8}
        fill={colors.darkBlue}
      />
    </Svg>
  );
}

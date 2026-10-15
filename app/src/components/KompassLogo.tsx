import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Path, Polygon, Rect } from "react-native-svg";
import { colors } from "../theme/tokens";

const BRAND_LABEL = "Deutsche Bank Kompass";
// Proportions relative to the wordmark's font size.
const BANK_TEXT_RATIO = 0.42;
const COMPASS_RATIO = 0.66;
const COMPASS_DROP_RATIO = 0.07;
const LETTER_SPACING_RATIO = -0.045;
const LINE_HEIGHT_RATIO = 1.2;
const TICKS = [0, 90, 180, 270];

/** The "o" of Kompass, drawn as a compass with a gold north needle. */
function CompassO({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle
        cx="50"
        cy="50"
        r="42"
        stroke={color}
        strokeWidth="13"
        fill="none"
      />
      {TICKS.map((angle) => (
        <Line
          key={angle}
          x1="50"
          y1="17"
          x2="50"
          y2="25"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          transform={`rotate(${angle} 50 50)`}
        />
      ))}
      <Polygon points="50,24 59,50 41,50" fill={colors.coinGold} />
      <Polygon points="50,76 59,50 41,50" fill={color} />
      <Circle cx="50" cy="50" r="5" fill={colors.white} />
    </Svg>
  );
}

/** Deutsche Bank's slash mark: a square with a diagonal bar. */
function BankMark({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30">
      <Rect
        x="2"
        y="2"
        width="26"
        height="26"
        stroke={color}
        strokeWidth="3"
        fill="none"
      />
      <Path d="M8 23 L18 7 H24 L14 23Z" fill={color} />
    </Svg>
  );
}

/**
 * Deutsche Bank Kompass wordmark, drawn rather than cropped from an image so
 * it looks the same in every country, at any size and on any background.
 */
export function KompassLogo({
  size = 36,
  light = false,
  showBank = true,
}: {
  /** Font size of "Kompass"; everything else scales from it. */
  size?: number;
  light?: boolean;
  showBank?: boolean;
}) {
  const color = light ? colors.white : colors.deepBlue;
  const bankSize = size * BANK_TEXT_RATIO;
  const word = {
    color,
    fontSize: size,
    lineHeight: size * LINE_HEIGHT_RATIO,
    fontWeight: "800" as const,
    letterSpacing: size * LETTER_SPACING_RATIO,
  };
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={BRAND_LABEL}
    >
      {showBank && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: bankSize * 0.35,
          }}
        >
          <BankMark size={bankSize * 1.25} color={color} />
          <Text style={{ color, fontSize: bankSize, fontWeight: "700" }}>
            Deutsche Bank
          </Text>
        </View>
      )}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={word}>K</Text>
        <View
          style={{
            marginHorizontal: size * 0.02,
            transform: [{ translateY: size * COMPASS_DROP_RATIO }],
          }}
        >
          <CompassO size={size * COMPASS_RATIO} color={color} />
        </View>
        <Text style={word}>mpass</Text>
      </View>
    </View>
  );
}

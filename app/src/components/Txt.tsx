import React from "react";
import { Text, TextProps } from "react-native";
import { useApp } from "../state/useApp";
import { colors as c, typeScale, TypeVariant } from "../theme/tokens";

// Text colors by role. Body text is ink; feedback tones are for results only.
const TONES = {
  ink: c.darkBlue,
  brand: c.deepBlue,
  light: c.white,
  danger: c.errorText,
  positive: c.successText,
  reward: c.coinGoldText,
} as const;
export type TxtTone = keyof typeof TONES;

const WEIGHTS = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;
export type TxtWeight = keyof typeof WEIGHTS;

/**
 * Text on the fixed type scale in a brand color role. Every size grows when
 * the learner turns on larger text. Size, color and weight are props, not
 * classes: inline styles win over className in NativeWind, so classes for
 * them would be silently ignored.
 */
export function Txt({
  style,
  variant = "body",
  tone = "ink",
  weight,
  light = false,
  ...props
}: TextProps & {
  variant?: TypeVariant;
  tone?: TxtTone;
  weight?: TxtWeight;
  /** Shorthand for tone="light" on deep or dark blue backgrounds. */
  light?: boolean;
}) {
  const large = useApp((s) => s.large);
  const type = typeScale[variant];
  return (
    <Text
      {...props}
      style={[
        {
          color: TONES[light ? "light" : tone],
          fontSize: large ? type.largeFontSize : type.fontSize,
          lineHeight: large ? type.largeLineHeight : type.lineHeight,
          fontWeight: weight ? WEIGHTS[weight] : type.fontWeight,
        },
        style,
      ]}
    />
  );
}

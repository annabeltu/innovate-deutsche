import React from "react";
import { Text, TextProps } from "react-native";
import { useApp } from "../state/useApp";
import { colors as c, typeScale, TypeVariant } from "../theme/tokens";

/**
 * Text in brand ink on the fixed type scale. Every size grows when the
 * learner turns on larger text, so screens never set ad-hoc font sizes.
 */
export function Txt({
  style,
  variant = "body",
  light = false,
  ...props
}: TextProps & {
  variant?: TypeVariant;
  /** White text for deep or dark blue backgrounds. */
  light?: boolean;
}) {
  const large = useApp((s) => s.large);
  const type = typeScale[variant];
  return (
    <Text
      {...props}
      style={[
        {
          color: light ? c.white : c.darkBlue,
          fontSize: large ? type.largeFontSize : type.fontSize,
          lineHeight: large ? type.largeLineHeight : type.lineHeight,
          fontWeight: type.fontWeight,
        },
        style,
      ]}
    />
  );
}

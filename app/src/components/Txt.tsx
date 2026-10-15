import React from "react";
import { Text, TextProps } from "react-native";
import { useApp } from "../state/useApp";
import { colors as c } from "../theme/tokens";

/** Body text in brand ink that grows when the learner turns on larger text. */
export function Txt({ style, ...props }: TextProps) {
  const large = useApp((s) => s.large);
  return (
    <Text
      {...props}
      style={[
        {
          color: c.darkBlue,
          fontSize: large ? 19 : 16,
          lineHeight: large ? 28 : 24,
        },
        style,
      ]}
    />
  );
}

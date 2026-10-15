import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useCallback } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { router, useFocusEffect } from "expo-router";
import * as Speech from "expo-speech";
import { useTranslation } from "react-i18next";
import { useApp } from "../state/useApp";
import { colors as c, regionAccents } from "../theme/tokens";
import { Txt } from "./Txt";
export { c, Txt };
export { Kiko, KikoNote, useReduceMotion } from "./Kiko";
export type { KikoMood, KikoTone } from "./Kiko";
export function Title({
  children,
  light = false,
}: {
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <Txt
      accessibilityRole="header"
      style={{
        fontSize: 36,
        lineHeight: 42,
        letterSpacing: -1.3,
        fontWeight: "500",
        color: light ? c.white : c.darkBlue,
        marginVertical: 12,
      }}
    >
      {children}
    </Txt>
  );
}
export function Label({
  children,
  light = false,
}: {
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <Txt
      style={{
        fontSize: 12,
        letterSpacing: 2,
        fontWeight: "700",
        color: light ? c.lightBlue : c.midBlue,
      }}
    >
      {children}
    </Txt>
  );
}
// Pressing a chunky surface sinks it into its bottom border, like a real key.
function pressedDepth(pressed: boolean, depth: number): ViewStyle {
  return pressed ? { borderBottomWidth: 2, marginTop: depth - 2 } : {};
}
type FeatherName = React.ComponentProps<typeof Feather>["name"];
const BUTTON_DEPTH = 6;
const CHOICE_DEPTH = 4;

/** Primary (deep blue) or secondary (white) action with an optional icon. */
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: FeatherName;
}) {
  const { t } = useTranslation();
  const labelColor = secondary ? c.deepBlue : c.white;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={t("actionHint")}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: secondary ? c.white : c.deepBlue,
          borderBottomColor: secondary ? c.lightBlue : c.darkBlue,
          opacity: disabled ? 0.45 : 1,
        },
        pressedDepth(pressed && !disabled, BUTTON_DEPTH),
      ]}
    >
      <Txt
        style={{
          color: labelColor,
          fontWeight: "700",
          fontSize: 18,
          textAlign: "center",
        }}
      >
        {title}
      </Txt>
      {icon && <Feather name={icon} size={22} color={labelColor} />}
    </Pressable>
  );
}
export function Choice({
  title,
  selected,
  onPress,
  icon,
  style,
}: {
  title: string;
  selected?: boolean;
  onPress: () => void;
  icon?: string;
  style?: ViewStyle;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      accessibilityHint={t("app.selectHint")}
      style={({ pressed }) => [
        s.choice,
        selected && { borderColor: c.deepBlue, backgroundColor: c.iceBlue },
        style,
        pressedDepth(pressed, CHOICE_DEPTH),
      ]}
    >
      {icon && (
        <Txt style={{ fontSize: 30, lineHeight: 40, textAlign: "center" }}>
          {icon}
        </Txt>
      )}
      <Txt style={{ fontWeight: "700", textAlign: "center" }}>{title}</Txt>
    </Pressable>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}
function spokenText(node: React.ReactNode): string {
  return React.Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number")
        return String(child);
      if (
        !React.isValidElement<{
          children?: React.ReactNode;
          title?: string;
          accessibilityLabel?: string;
        }>(child)
      )
        return "";
      return (
        child.props.accessibilityLabel ||
        child.props.title ||
        spokenText(child.props.children)
      );
    })
    .filter(Boolean)
    .join(". ");
}
export function Screen({
  children,
  dark = false,
  footer,
  compact = false,
  background,
  narrate = true,
}: {
  children: React.ReactNode;
  dark?: boolean;
  footer?: React.ReactNode;
  compact?: boolean;
  background?: React.ReactNode;
  narrate?: boolean;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const readAloud = useApp((s) => s.readAloud);
  const language = useApp((s) => s.language);
  const narration = spokenText([children, footer]);
  const speak = useCallback(() => {
    void Speech.stop();
    Speech.speak(narration, { language });
  }, [narration, language]);
  useFocusEffect(
    useCallback(() => {
      if (readAloud && narrate) speak();
      return () => {
        void Speech.stop();
      };
    }, [readAloud, narrate, speak]),
  );
  return (
    <LinearGradient
      colors={dark ? [c.duskBlue, c.darkBlue] : [c.white, c.iceBlue]}
      style={{ flex: 1 }}
    >
      {background}
      <ScrollView
        testID="screen-scroll"
        contentContainerStyle={{
          paddingHorizontal: compact ? 16 : 24,
          paddingLeft: (compact ? 16 : 24) + insets.left,
          paddingRight: (compact ? 16 : 24) + insets.right,
          paddingTop: (compact ? 16 : 24) + insets.top,
          paddingBottom: (compact ? 12 : 32) + (footer ? 0 : insets.bottom),
          gap: 20,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            width: "100%",
            alignSelf: "center",
            gap: compact ? 12 : 20,
            flex: 1,
          }}
        >
          {children}
          {readAloud && narrate && (
            <Button
              secondary
              title={t("app.repeat")}
              icon="volume-2"
              onPress={speak}
            />
          )}
        </View>
      </ScrollView>
      {footer && (
        <View
          testID="screen-footer"
          style={{
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          }}
        >
          {footer}
        </View>
      )}
    </LinearGradient>
  );
}
export function Row({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Progress({ value }: { value: number }) {
  const { t } = useTranslation();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={t("app.progress")}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={{
        height: 8,
        backgroundColor: c.lightBlue,
        borderRadius: 10,
        flex: 1,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${value * 100}%`,
          height: 8,
          backgroundColor: c.brightBlue,
          borderRadius: 10,
        }}
      />
    </View>
  );
}
export function Landscape({
  country,
  small = false,
}: {
  country: "US" | "MX" | "KE";
  small?: boolean;
}) {
  return (
    <Svg
      width="100%"
      height={small ? 52 : 260}
      viewBox="0 0 400 240"
      preserveAspectRatio="none"
    >
      <Circle
        cx="315"
        cy="50"
        r="42"
        fill={regionAccents[country]}
        opacity="0.45"
      />
      <Path
        d="M0 120 L75 55 L160 130 L260 40 L400 100 V240 H0Z"
        fill={regionAccents[country]}
        opacity="0.6"
      />
      <Path
        d="M0 175 L90 130 L180 210 L280 105 L400 180 V240 H0Z"
        fill={c.midBlue}
      />
      {country === "US" ? (
        <>
          <Rect x="30" y="100" width="38" height="140" fill={c.deepBlue} />
          <Rect x="90" y="70" width="50" height="170" fill={c.deepBlue} />
          <Path
            d="M115 35 V70 M160 240 V120 H200 V240"
            stroke={c.deepBlue}
            strokeWidth="7"
            fill={c.deepBlue}
          />
        </>
      ) : country === "MX" ? (
        <>
          <Path
            d="M30 225 H190 L175 195 H160 V170 H140 V145 H110 V170 H90 V195 H65Z"
            fill={c.deepBlue}
          />
          <Path
            d="M290 225 V120 M290 160 H265 V140 M290 185 H315 V155"
            stroke={c.deepBlue}
            strokeWidth="12"
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : (
        <>
          <Path
            d="M100 225 L110 130 M110 165 L75 130 M110 155 L145 125"
            stroke={c.deepBlue}
            strokeWidth="9"
          />
          <Path
            d="M35 135 Q45 100 80 110 Q110 75 140 105 Q180 100 190 135Z"
            fill={c.deepBlue}
          />
        </>
      )}
      <Path
        d="M0 225 L90 170 L180 240 L285 160 L400 225 V240 H0Z"
        fill={c.darkBlue}
      />
    </Svg>
  );
}
export function Nav({ active }: { active: string }) {
  const { t } = useTranslation();
  const items = [
    ["path", "arrow-right", "/roadmap"],
    ["practice", "book-open", "/practice"],
    ["ask", "mic", "/ask"],
    ["leagues", "award", "/leagues"],
    ["shop", "shopping-bag", "/shop"],
  ] as const;
  return (
    <View
      className="flex-row bg-white"
      style={{ paddingVertical: 12, borderTopWidth: 1, borderColor: c.iceBlue }}
    >
      {items.map(([name, icon, url]) => (
        <Pressable
          key={name}
          onPress={() => router.replace(url)}
          accessibilityRole="tab"
          accessibilityLabel={t(name)}
          accessibilityHint={t("app.navHint", { screen: t(name) })}
          accessibilityState={{ selected: active === name }}
          style={{ flex: 1, minHeight: 48, alignItems: "center", gap: 4 }}
        >
          <Feather
            name={icon}
            size={23}
            color={active === name ? c.deepBlue : c.midBlue}
          />
          <Txt
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: active === name ? c.deepBlue : c.midBlue,
            }}
          >
            {t(name)}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  button: {
    padding: 19,
    borderRadius: 20,
    borderBottomWidth: BUTTON_DEPTH,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  choice: {
    backgroundColor: c.white,
    borderWidth: 2,
    borderColor: "transparent",
    borderBottomWidth: CHOICE_DEPTH,
    borderBottomColor: c.grey,
    borderRadius: 18,
    padding: 14,
    minHeight: 56,
    justifyContent: "center",
  },
  card: {
    backgroundColor: c.white,
    borderRadius: 24,
    padding: 20,
    borderBottomWidth: 5,
    borderBottomColor: c.lightBlue,
    gap: 12,
  },
});

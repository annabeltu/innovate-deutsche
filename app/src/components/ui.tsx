import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewStyle,
  AccessibilityInfo,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, Path, Polygon, Rect } from "react-native-svg";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { router, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useApp } from "../state/useApp";
import { colors as c, regionAccents } from "../theme/tokens";
import { stopSpeaking } from "../voice/speech";
import { useNarration } from "../voice/narration";
import { ReadAloudDock } from "./ReadAloudBubble";
export { c };
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
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  /** Spoken name when the visible title is a symbol, such as "×". */
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint ?? t("voice.buttonHint")}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: secondary ? c.white : c.deepBlue,
          borderBottomColor: secondary ? c.lightBlue : c.darkBlue,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <Txt
        style={{
          color: secondary ? c.deepBlue : c.white,
          fontWeight: "700",
          fontSize: 18,
          textAlign: "center",
        }}
      >
        {title}
      </Txt>
    </Pressable>
  );
}
export function Choice({
  title,
  selected,
  onPress,
  icon,
  style,
  accessibilityLabel,
}: {
  title: string;
  selected?: boolean;
  onPress: () => void;
  icon?: string;
  style?: ViewStyle;
  /** Spoken name when the visible title is a symbol, such as "‹". */
  accessibilityLabel?: string;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ selected }}
      accessibilityHint={t("voice.choiceHint")}
      style={[
        s.choice,
        selected && { borderColor: c.deepBlue, backgroundColor: "#F7FAFF" },
        style,
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
}: {
  children: React.ReactNode;
  dark?: boolean;
  footer?: React.ReactNode;
  compact?: boolean;
  background?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const readAloud = useApp((s) => s.readAloud);
  const narration = spokenText([children, footer]);
  useFocusEffect(
    useCallback(() => {
      // Nothing plays by itself: the read-aloud bubble reads this on request.
      useNarration.getState().setText(narration);
      return stopSpeaking;
    }, [narration]),
  );
  return (
    <LinearGradient
      colors={dark ? ["#294DB3", c.darkBlue] : ["#FFFFFF", c.iceBlue]}
      style={{ flex: 1 }}
    >
      {background}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: compact ? 16 : 24,
          paddingLeft: (compact ? 16 : 24) + insets.left,
          paddingRight: (compact ? 16 : 24) + insets.right,
          paddingTop: (compact ? 16 : 24) + insets.top,
          paddingBottom:
            (compact ? 12 : 32) + (footer || readAloud ? 0 : insets.bottom),
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
        </View>
      </ScrollView>
      <ReadAloudDock bottomInset={!footer} />
      {footer && (
        <View
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
  return (
    <View
      accessibilityRole="progressbar"
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
export function Kiko({
  size = 130,
  pulse = false,
}: {
  size?: number;
  pulse?: boolean;
}) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const [reduce, setReduce] = useState(false);
  const simple = useApp((s) => s.simple);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduce,
    );
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (pulse && !reduce && !simple)
      scale.value = withRepeat(withTiming(1.07, { duration: 1100 }), -1, true);
    else scale.value = 1;
    return () => cancelAnimation(scale);
  }, [pulse, reduce, simple, scale]);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View
      accessible
      accessibilityLabel={t("voice.kiko")}
      style={[{ width: size, height: size, alignSelf: "center" }, animated]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 140 140">
        <Circle cx="70" cy="75" r="55" fill={c.darkBlue} />
        <Circle
          cx="70"
          cy="68"
          r="53"
          fill={c.deepBlue}
          stroke="white"
          strokeWidth="7"
        />
        <Path
          d="M10 86 L0 81 M130 86 L140 81"
          stroke={c.brightBlue}
          strokeWidth="12"
          strokeLinecap="round"
        />
        <Polygon
          points="70,39 74,48 84,49 76,55 76,65 69,59 59,63 62,53 55,46 65,46"
          fill={c.coinGold}
        />
        <Ellipse cx="51" cy="79" rx="5" ry="8" fill="white" />
        <Ellipse cx="89" cy="79" rx="5" ry="8" fill="white" />
        <Path
          d="M61 86 Q70 99 80 86"
          stroke="white"
          strokeWidth="2"
          fill="none"
        />
      </Svg>
    </Animated.View>
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
    borderBottomWidth: 6,
    minHeight: 64,
  },
  choice: {
    backgroundColor: c.white,
    borderWidth: 2,
    borderColor: "transparent",
    borderBottomWidth: 4,
    borderBottomColor: "#D6DFF1",
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

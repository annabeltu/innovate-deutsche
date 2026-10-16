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
import { setStatusBarStyle } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import { useApp } from "../state/useApp";
import {
  colors as c,
  depth,
  layout,
  minTapTarget,
  radii,
  regionAccents,
  spacing,
} from "../theme/tokens";
import { stopSpeaking } from "../voice/speech";
import { useNarration } from "../voice/narration";
import { ReadAloudDock } from "./ReadAloudBubble";
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
      variant="title"
      light={light}
      style={{ letterSpacing: -1.3 }}
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
      variant="caption"
      weight="bold"
      style={{
        letterSpacing: 2,
        // Every kicker reads the same, whatever casing the translation uses.
        textTransform: "uppercase",
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
const BUTTON_DEPTH = depth.button;
const CHOICE_DEPTH = depth.option;

/** Primary (deep blue) or secondary (white) action with an optional icon. */
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  icon,
  accessibilityLabel,
  accessibilityHint,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: FeatherName;
  /** Spoken name when the visible title is a symbol, such as "→". */
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const { t } = useTranslation();
  const labelColor = secondary ? c.deepBlue : c.white;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint ?? t("actionHint")}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
    >
      {({ pressed }) => (
        // Styled on an inner View: a style function on Pressable is dropped on
        // native iOS here, which left buttons without a background.
        <View
          style={[
            s.button,
            {
              backgroundColor: secondary ? c.white : c.deepBlue,
              borderBottomColor: secondary ? c.lightBlue : c.darkBlue,
              opacity: disabled ? DISABLED_OPACITY : 1,
            },
            pressedDepth(pressed && !disabled, BUTTON_DEPTH),
          ]}
        >
          <Txt
            variant="subheading"
            style={{ color: labelColor, textAlign: "center" }}
          >
            {title}
          </Txt>
          {icon && <Feather name={icon} size={22} color={labelColor} />}
        </View>
      )}
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
  accessibilityHint,
}: {
  title: string;
  selected?: boolean;
  onPress: () => void;
  icon?: string;
  style?: ViewStyle;
  /** Spoken name when the visible title is a symbol, such as "‹". */
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ selected }}
      accessibilityHint={accessibilityHint ?? t("app.selectHint")}
      style={style}
    >
      {({ pressed }) => (
        <View
          style={[
            s.choice,
            selected && { borderColor: c.deepBlue, backgroundColor: c.iceBlue },
            pressedDepth(pressed, CHOICE_DEPTH),
          ]}
        >
          {icon && (
            <Txt variant="title" style={{ textAlign: "center" }}>
              {icon}
            </Txt>
          )}
          <Txt variant="subheading" style={{ textAlign: "center" }}>
            {title}
          </Txt>
        </View>
      )}
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
  const insets = useSafeAreaInsets();
  const readAloud = useApp((s) => s.readAloud);
  const narration = spokenText([children, footer]);
  useFocusEffect(
    useCallback(() => {
      // Nothing plays by itself: the read-aloud bubble reads this on request.
      // Screens can opt out (narrate=false), e.g. while Ask Kiko is recording.
      if (narrate) useNarration.getState().setText(narration);
      return stopSpeaking;
    }, [narration, narrate]),
  );
  // Light status bar text on the deep blue screens, dark text everywhere else.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(dark ? "light" : "dark");
    }, [dark]),
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
          paddingLeft: layout.pagePadding + insets.left,
          paddingRight: layout.pagePadding + insets.right,
          paddingTop: spacing.lg + insets.top,
          // The read-aloud dock clears the home indicator when it is shown.
          paddingBottom:
            layout.sectionGap + (footer || readAloud ? 0 : insets.bottom),
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            width: "100%",
            // Compact screens (roadmap, challenges) use the full phone width.
            maxWidth: compact ? undefined : layout.maxContentWidth,
            alignSelf: "center",
            gap: compact ? layout.itemGap : layout.sectionGap,
            flex: 1,
          }}
        >
          {children}
        </View>
      </ScrollView>
      <ReadAloudDock bottomInset={!footer} />
      {footer && (
        // The footer (Nav or ActionBar) pads for the home indicator itself,
        // so its background runs to the bottom edge.
        <View
          testID="screen-footer"
          style={{ paddingLeft: insets.left, paddingRight: insets.right }}
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
          gap: layout.itemGap,
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
      accessible
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
const NAV_ITEMS = [
  ["path", "home", "/roadmap"],
  ["practice", "book-open", "/practice"],
  ["ask", "message-circle", "/ask"],
  ["leagues", "award", "/leagues"],
  ["shop", "shopping-bag", "/shop"],
] as const;
const NAV_ICON_SIZE = 24;

/** The one bottom tab bar, shared by every main screen. */
export function Nav({ active = "path" }: { active?: string }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View
      testID="tab-bar"
      style={[s.nav, { paddingBottom: spacing.md + insets.bottom }]}
    >
      {NAV_ITEMS.map(([name, icon, route]) => {
        const selected = name === active;
        const color = selected ? c.deepBlue : c.midBlue;
        return (
          <Pressable
            key={name}
            accessibilityRole="tab"
            accessibilityLabel={t(name)}
            accessibilityHint={t("roadmapScreen.navHint", { screen: t(name) })}
            accessibilityState={{ selected }}
            onPress={() => router.replace(route)}
            style={s.navItem}
          >
            <Feather name={icon} size={NAV_ICON_SIZE} color={color} />
            <Txt variant="caption" weight="bold" style={{ color }}>
              {t(name)}
            </Txt>
            <View
              style={[s.navMarker, selected && { backgroundColor: c.deepBlue }]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Bottom action area for a Screen footer: full width inside the page
 * padding, with stacked actions separated by the item gap.
 */
export function ActionBar({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      testID="action-bar"
      style={[s.actionBar, { paddingBottom: spacing.lg + insets.bottom }]}
    >
      {children}
    </View>
  );
}

/** Low-emphasis text action (such as "‹ Back") with a 48 pt tap target. */
export function TextButton({
  title,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={spacing.sm}
      style={[s.textButton, disabled && s.disabled]}
    >
      <Txt variant="subheading" tone="brand">
        {title}
      </Txt>
    </Pressable>
  );
}

/** Round icon-only control (back, close) with a 48 pt tap target. */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
}: {
  icon: FeatherName;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={spacing.sm}
      style={[s.iconButton, disabled && s.disabled]}
    >
      <Feather name={icon} size={NAV_ICON_SIZE} color={c.deepBlue} />
    </Pressable>
  );
}

type OptionTone = "neutral" | "danger" | "positive";
const OPTION_TONES: Record<
  OptionTone,
  { background: string; border: string; text: string }
> = {
  neutral: { background: c.white, border: c.grey, text: c.darkBlue },
  danger: {
    background: c.warningSurface,
    border: c.errorText,
    text: c.errorText,
  },
  positive: {
    background: c.successSurface,
    border: c.successText,
    text: c.successText,
  },
};

/**
 * Answer option for quizzes and challenges: equal size, letter badge on
 * the left, deep blue outline when selected. Danger and positive tones are
 * only for answers that are themselves feedback (Scam / Legit).
 */
export function OptionRow({
  title,
  letter,
  selected = false,
  onPress,
  disabled = false,
  tone = "neutral",
  centered = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = "radio",
}: {
  title: string;
  letter?: string;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
  tone?: OptionTone;
  /** Center the title, for short side-by-side answers. */
  centered?: boolean;
  accessibilityLabel?: string;
  accessibilityHint: string;
  accessibilityRole?: "radio" | "button";
}) {
  const colors = OPTION_TONES[tone];
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
    >
      {({ pressed }) => (
        <View
          style={[
            s.option,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
            },
            selected && { borderColor: c.deepBlue, backgroundColor: c.iceBlue },
            pressedDepth(pressed && !disabled, CHOICE_DEPTH),
          ]}
        >
          {letter && (
            <View
              style={[
                s.optionLetter,
                selected && { backgroundColor: c.deepBlue },
              ]}
            >
              <Txt
                variant="subheading"
                style={{ color: selected ? c.white : c.deepBlue }}
              >
                {letter}
              </Txt>
            </View>
          )}
          <Txt
            variant={centered ? "subheading" : "body"}
            style={{
              flex: 1,
              color: colors.text,
              textAlign: centered ? "center" : "left",
            }}
          >
            {title}
          </Txt>
          {selected && (
            <Feather name="check" size={NAV_ICON_SIZE} color={c.deepBlue} />
          )}
        </View>
      )}
    </Pressable>
  );
}
const OPTION_LETTER_SIZE = 36;
const NAV_MARKER = { width: 40, height: 4 };
const DISABLED_OPACITY = 0.45;

const s = StyleSheet.create({
  button: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.button,
    borderBottomWidth: BUTTON_DEPTH,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  choice: {
    backgroundColor: c.white,
    borderWidth: 2,
    borderColor: "transparent",
    borderBottomWidth: CHOICE_DEPTH,
    borderBottomColor: c.grey,
    borderRadius: radii.option,
    padding: spacing.md,
    minHeight: 56,
    justifyContent: "center",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 2,
    borderColor: "transparent",
    borderBottomWidth: CHOICE_DEPTH,
    borderRadius: radii.option,
    padding: spacing.lg,
    minHeight: 64,
  },
  optionLetter: {
    width: OPTION_LETTER_SIZE,
    height: OPTION_LETTER_SIZE,
    borderRadius: radii.pill,
    backgroundColor: c.iceBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: c.white,
    borderRadius: radii.card,
    padding: spacing.lg,
    borderBottomWidth: depth.card,
    borderBottomColor: c.lightBlue,
    gap: layout.itemGap,
  },
  actionBar: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    paddingHorizontal: layout.pagePadding,
    paddingTop: spacing.md,
    gap: layout.itemGap,
  },
  iconButton: {
    minWidth: minTapTarget,
    minHeight: minTapTarget,
    borderRadius: radii.pill,
    backgroundColor: c.white,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: DISABLED_OPACITY },
  textButton: {
    minHeight: minTapTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  nav: {
    flexDirection: "row",
    backgroundColor: c.white,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    // Square bottom so the bar sits flush with the screen edge.
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  navItem: {
    flex: 1,
    minHeight: minTapTarget,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  navMarker: {
    ...NAV_MARKER,
    borderRadius: radii.pill,
  },
});

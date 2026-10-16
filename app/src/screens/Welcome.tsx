import React, { useCallback } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useWindowSize } from "../hooks/use-window-size";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import Svg, { Image as SvgImage } from "react-native-svg";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import {
  ROTATING_LANGUAGES,
  useRotatingLanguage,
} from "../i18n/use-rotating-language";
import { lessonLanguage } from "../api/learner";
import { Country, useApp } from "../state/useApp";
import { Button, Txt } from "../components/ui";
import { alpha, colors } from "../theme/tokens";
import { LanguageSelector } from "../components/LanguageSelector";
import { ACCESSIBILITY_OPTIONS } from "../onboarding/options";
import { stopSpeaking } from "../voice/speech";
import { useNarration } from "../voice/narration";
import { ReadAloudDock } from "../components/ReadAloudBubble";
import { KompassLogo } from "../components/KompassLogo";

const blue = colors.deepBlue;
const ink = colors.darkBlue;
const reference = require("../../assets/welcome/reference.png");
const countries = {
  US: {
    crop: "120 1085 185 132",
    image: require("../../assets/welcome/us.png"),
  },
  MX: {
    crop: "349 1085 186 132",
    image: require("../../assets/welcome/mx.png"),
  },
  KE: {
    crop: "578 1085 187 132",
    image: require("../../assets/welcome/ke.png"),
  },
};

// Display only the relevant illustration region. The reference's phone frame,
// progress badge and controls are never displayed; controls below are native.
function ReferenceArt({ crop }: { crop: string }) {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={crop}
      preserveAspectRatio="xMidYMid slice"
      accessible={false}
    >
      <SvgImage href={reference} x={0} y={0} width={884} height={1779} />
    </Svg>
  );
}

export function Welcome() {
  const s = useApp();
  const { t } = useTranslation();
  const rotating = useRotatingLanguage(!s.languageChosen);
  /** Visible text: cycles through every language until the learner picks one. */
  const shown = (key: string) =>
    rotating ? i18n.getFixedT(rotating)(key) : t(key);
  /** Screen-reader text: names all three languages at once instead of cycling. */
  const spoken = (key: string) =>
    s.languageChosen
      ? t(key)
      : ROTATING_LANGUAGES.map((lang) => i18n.getFixedT(lang)(key)).join(". ");
  const { width, height, fontScale } = useWindowSize();
  const insets = useSafeAreaInsets();
  const pageWidth = width - insets.left - insets.right;
  const availableHeight = height - insets.top - insets.bottom;
  const unit = Math.min(pageWidth / 388, Math.max(0.85, availableHeight / 810));
  const narrow = pageWidth < 320 || fontScale > 1.3 || s.large;
  const padding = pageWidth * 0.065;
  const gap = 9 * unit;
  const heroHeight = Math.max(220 * unit, availableHeight - 520 * unit);
  const labelStyle = {
    fontSize: s.large ? 18 : 12.5 * unit,
    lineHeight: s.large ? 25 : 19 * unit,
  };
  const narration = `Deutsche Bank. Kompass. ${t("language")}. ${t("country")}. ${t(`onboarding.country.${s.country}`)}. ${t("access")}. ${t("getStarted")}.`;
  useFocusEffect(
    useCallback(() => {
      // Nothing plays by itself: the read-aloud bubble reads this on request.
      useNarration.getState().setText(narration);
      return stopSpeaking;
    }, [narration]),
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.page,
            { minHeight: availableHeight - Math.max(56, 55 * unit) - 20 },
          ]}
        >
          <View style={{ height: heroHeight, overflow: "hidden" }}>
            {/* One continuous scene per country, so no sky strip or crop seam. */}
            <Image
              key={s.country}
              source={countries[s.country].image}
              resizeMode="cover"
              style={{ width: "100%", height: "100%" }}
              accessible
              accessibilityLabel={spoken(
                `app.${{ US: "usaScene", MX: "mexicoScene", KE: "kenyaScene" }[s.country]}`,
              )}
            />
            <LinearGradient
              pointerEvents="none"
              colors={[
                alpha(colors.welcomePanel, 0.94),
                alpha(colors.welcomePanel, 0.45),
                colors.welcomePanelTransparent,
              ]}
              locations={[0, 0.55, 1]}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 130 * unit,
              }}
            />
            <View
              style={{
                position: "absolute",
                left: padding,
                top: insets.top + 10 * unit,
                width: pageWidth * 0.48,
                height: pageWidth * 0.188,
              }}
            >
              <KompassLogo size={42 * unit} />
            </View>
          </View>
          <View
            style={[
              styles.panel,
              {
                paddingHorizontal: padding,
                paddingTop: 16 * unit,
                paddingBottom: 18 * unit,
                borderTopLeftRadius: 28 * unit,
                borderTopRightRadius: 28 * unit,
              },
            ]}
          >
            <Txt style={[styles.label, labelStyle]}>{shown("language")}</Txt>
            <LanguageSelector stacked={narrow} />
            <Txt style={[styles.label, labelStyle, { marginTop: 17 * unit }]}>
              {shown("country")}
            </Txt>
            <View style={[styles.grid, { gap, marginTop: 9 * unit }]}>
              {(Object.keys(countries) as Country[]).map((code) => (
                <Pressable
                  key={code}
                  accessibilityRole="button"
                  accessibilityLabel={spoken(`onboarding.country.${code}`)}
                  accessibilityHint={t("app.selectHint")}
                  accessibilityState={{ selected: s.country === code }}
                  onPress={() =>
                    s.set({
                      country: code,
                      language: lessonLanguage(code, s.language),
                    })
                  }
                  style={[
                    styles.tile,
                    {
                      flexBasis: narrow ? "100%" : "28%",
                      flexGrow: 1,
                      padding: 6 * unit,
                      minHeight: 114 * unit,
                    },
                    s.country === code && styles.selected,
                  ]}
                >
                  <View
                    style={{
                      width: "100%",
                      aspectRatio: narrow ? 3 : 1.4,
                      borderRadius: 9 * unit,
                      overflow: "hidden",
                    }}
                  >
                    <ReferenceArt crop={countries[code].crop} />
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 2,
                      paddingVertical: 8 * unit,
                    }}
                  >
                    <Txt
                      style={[
                        styles.countryName,
                        {
                          fontSize: s.large ? 18 : 11.5 * unit,
                          lineHeight: s.large ? 25 : 16 * unit,
                        },
                      ]}
                    >
                      {shown(`onboarding.country.${code}`)}
                    </Txt>
                    <Feather
                      name="chevron-right"
                      size={15 * unit}
                      color={ink}
                    />
                  </View>
                </Pressable>
              ))}
            </View>
            <Txt style={[styles.label, labelStyle, { marginTop: 18 * unit }]}>
              {shown("access")}
            </Txt>
            <View style={[styles.grid, { gap, marginTop: 9 * unit }]}>
              {ACCESSIBILITY_OPTIONS.map((option) => {
                const controls = {
                  readAloud: { key: "readAloud", icon: "volume-2" },
                  simpleMode: { key: "simple", icon: "help-circle" },
                  largerText: { key: "large", icon: "type" },
                } as const;
                const { key, icon } = controls[option.id];
                const name = shown(option.labelKey);
                return (
                  <View
                    key={key}
                    style={[
                      styles.accessTile,
                      {
                        flexBasis: narrow ? "100%" : "28%",
                        flexGrow: 1,
                        minHeight: 82 * unit,
                        paddingVertical: 8 * unit,
                        gap: 5 * unit,
                      },
                    ]}
                  >
                    {key === "large" ? (
                      <Txt
                        style={{
                          color: ink,
                          fontSize: 22 * unit,
                          lineHeight: 25 * unit,
                          fontWeight: "700",
                        }}
                      >
                        Aa
                      </Txt>
                    ) : (
                      <Feather name={icon} size={23 * unit} color={ink} />
                    )}
                    <Txt
                      style={[
                        styles.accessName,
                        {
                          fontSize: s.large ? 17 : 10.5 * unit,
                          lineHeight: s.large ? 24 : 15 * unit,
                        },
                      ]}
                    >
                      {name}
                    </Txt>
                    <View
                      style={{
                        height: 24,
                        minWidth: 44,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Switch
                        accessibilityLabel={spoken(option.labelKey)}
                        accessibilityHint={t(option.helperKey)}
                        value={s[key]}
                        onValueChange={(value) => s.set({ [key]: value })}
                        trackColor={{
                          false: colors.grey,
                          true: colors.brightBlue,
                        }}
                        thumbColor={colors.white}
                        style={
                          Platform.OS === "ios"
                            ? { transform: [{ scale: 0.72 }] }
                            : undefined
                        }
                      />
                    </View>
                  </View>
                );
              })}
            </View>
            {s.onboarded && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("roadmap")}
                accessibilityHint={t("app.navHint", { screen: t("path") })}
                onPress={() => router.replace("/roadmap")}
                style={styles.extraAction}
              >
                <Txt style={styles.option}>{t("roadmap")}</Txt>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
      <ReadAloudDock />
      <View style={[styles.footer, { paddingBottom: 10 + insets.bottom }]}>
        <View
          style={{
            width: "100%",
            alignSelf: "center",
            paddingHorizontal: padding,
          }}
        >
          <Button
            title={shown("getStarted")}
            icon="arrow-right"
            accessibilityLabel={spoken("getStarted")}
            accessibilityHint={t("actionHint")}
            onPress={() => router.push("/onboarding")}
          />
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.iceBlue },
  content: { flex: 1, minHeight: 0 },
  footer: {
    flexShrink: 0,
    backgroundColor: colors.welcomePanel,
    paddingVertical: 10,
  },
  scroll: { flexGrow: 1 },
  page: {
    width: "100%",
    alignSelf: "center",
    backgroundColor: colors.welcomePanel,
  },
  panel: { marginTop: -10, backgroundColor: colors.welcomePanel },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  label: {
    color: ink,
    fontFamily: Platform.OS === "ios" ? "TrebuchetMS" : undefined,
  },
  tile: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
    padding: 8,
    justifyContent: "center",
    boxShadow: `0px 3px 0px ${colors.grey}`,
  },
  selected: { borderColor: blue, backgroundColor: colors.iceBlue },
  option: {
    fontWeight: "700",
    color: ink,
    textAlign: "center",
    lineHeight: 21,
  },
  countryName: { flex: 1, fontWeight: "600", color: ink },
  accessTile: {
    borderRadius: 14,
    backgroundColor: colors.white,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  accessName: { color: ink, textAlign: "center", fontWeight: "500" },
  extraAction: { minHeight: 44, justifyContent: "center", marginTop: 8 },
});

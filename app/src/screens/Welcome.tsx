import { LanguageSelector } from "../components/LanguageSelector";
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
import Svg, { Image as SvgImage, Path, Rect } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { Country, useApp } from "../state/useApp";
import { Txt } from "../components/ui";
import { speak as speakAloud, stopSpeaking } from "../voice/speech";

const blue = "#0012B3";
const ink = "#000C62";
const reference = require("../../assets/welcome/reference.png");
const countries = {
  US: {
    name: "United States",
    crop: "120 1085 185 132",
    image: require("../../assets/welcome/us.png"),
    scene: "Statue of Liberty and the New York skyline",
  },
  MX: {
    name: "Mexico",
    crop: "349 1085 186 132",
    image: require("../../assets/welcome/mx.png"),
    scene: "Mexican colonial architecture, blue tiled domes and palm trees",
  },
  KE: {
    name: "Kenya",
    crop: "578 1085 187 132",
    image: require("../../assets/welcome/ke.png"),
    scene: "Kenyan savannah, acacia trees and Mount Kenya at sunrise",
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
  const speak = useCallback(() => {
    void speakAloud(
      `Deutsche Bank. Kompass. ${t("language")}. ${t("country")}. ${countries[s.country].name}. ${t("access")}. ${t("getStarted")}`,
      { language: s.language, country: s.country },
    );
  }, [s.country, s.language, t]);
  useFocusEffect(
    useCallback(() => {
      if (s.readAloud) speak();
      return stopSpeaking;
    }, [s.readAloud, speak]),
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
            {s.country === "US" ? (
              <>
                <LinearGradient
                  colors={["#F6F4F5", "#BED8FC", "#8ABCF8"]}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={{ height: 87 * unit }}
                />
                <View style={{ flex: 1 }}>
                  <ReferenceArt crop="54 270 776 465" />
                </View>
              </>
            ) : (
              <>
                <Image
                  key={s.country}
                  source={countries[s.country].image}
                  resizeMode="cover"
                  style={{ width: "100%", height: "100%" }}
                  accessible
                  accessibilityLabel={countries[s.country].scene}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={[
                    "rgba(244,248,255,0.94)",
                    "rgba(244,248,255,0.45)",
                    "rgba(244,248,255,0)",
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
              </>
            )}
            <View
              accessibilityRole="header"
              accessibilityLabel="Deutsche Bank. Kompass"
              style={{
                position: "absolute",
                left: padding,
                top: insets.top + 10 * unit,
                width: pageWidth * 0.48,
                height: pageWidth * 0.188,
              }}
            >
              {s.country === "US" ? (
                <ReferenceArt crop="103 133 370 145" />
              ) : (
                <View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6 * unit,
                    }}
                  >
                    <Svg
                      width={20 * unit}
                      height={20 * unit}
                      viewBox="0 0 30 30"
                      accessible={false}
                    >
                      <Rect
                        x="2"
                        y="2"
                        width="26"
                        height="26"
                        stroke={blue}
                        strokeWidth="3"
                        fill="none"
                      />
                      <Path d="M8 23 L18 7 H24 L14 23Z" fill={blue} />
                    </Svg>
                    <Txt
                      style={{
                        fontSize: 15 * unit,
                        lineHeight: 22 * unit,
                        color: blue,
                        fontWeight: "700",
                      }}
                    >
                      Deutsche Bank
                    </Txt>
                  </View>
                  <Txt
                    style={{
                      fontSize: 42 * unit,
                      lineHeight: 50 * unit,
                      letterSpacing: -2,
                      color: blue,
                      fontWeight: "800",
                    }}
                  >
                    Kompass
                  </Txt>
                </View>
              )}
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
            <Txt style={[styles.label, labelStyle]}>{t("language")}</Txt>
            <LanguageSelector stacked={narrow} />
            <Txt style={[styles.label, labelStyle, { marginTop: 17 * unit }]}>
              {t("country")}
            </Txt>
            <View style={[styles.grid, { gap, marginTop: 9 * unit }]}>
              {(Object.keys(countries) as Country[]).map((code) => (
                <Pressable
                  key={code}
                  accessibilityRole="button"
                  accessibilityLabel={countries[code].name}
                  accessibilityState={{ selected: s.country === code }}
                  onPress={() => s.set({ country: code })}
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
                      {countries[code].name}
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
              {t("access")}
            </Txt>
            <View style={[styles.grid, { gap, marginTop: 9 * unit }]}>
              {(
                [
                  ["readAloud", "Read aloud", "volume-2"],
                  ["simple", "Simple mode", "help-circle"],
                  ["large", "Larger text", "type"],
                ] as const
              ).map(([key, name, icon]) => (
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
                      accessibilityLabel={name}
                      value={s[key]}
                      onValueChange={(value) => s.set({ [key]: value })}
                      trackColor={{ false: "#B9CEFC", true: "#93B8FF" }}
                      thumbColor="#FFFFFF"
                      style={
                        Platform.OS === "ios"
                          ? { transform: [{ scale: 0.72 }] }
                          : undefined
                      }
                    />
                  </View>
                </View>
              ))}
            </View>
            {s.readAloud && (
              <Pressable
                accessibilityRole="button"
                onPress={speak}
                style={styles.extraAction}
              >
                <Txt style={styles.option}>Repeat screen aloud</Txt>
              </Pressable>
            )}
            {s.onboarded && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace("/roadmap")}
                style={styles.extraAction}
              >
                <Txt style={styles.option}>{t("roadmap")}</Txt>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 10 + insets.bottom }]}>
        <View
          style={{
            width: "100%",
            alignSelf: "center",
            paddingHorizontal: padding,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("getStarted")}
            onPress={() => router.push("/onboarding")}
            style={[
              styles.go,
              {
                minHeight: Math.max(56, 55 * unit),
              },
            ]}
          >
            <Txt
              style={{
                color: "#FFFFFF",
                fontSize: 18 * unit,
                lineHeight: 26 * unit,
                fontWeight: "600",
              }}
            >
              {t("getStarted")}
            </Txt>
            <Feather name="arrow-right" size={25 * unit} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EDF3FF" },
  content: { flex: 1, minHeight: 0 },
  footer: {
    flexShrink: 0,
    backgroundColor: "#F5F7FE",
    paddingVertical: 10,
  },
  scroll: { flexGrow: 1 },
  page: {
    width: "100%",
    alignSelf: "center",
    backgroundColor: "#F5F7FE",
  },
  panel: { marginTop: -10, backgroundColor: "#F5F7FE" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  label: {
    color: ink,
    fontFamily: Platform.OS === "ios" ? "TrebuchetMS" : undefined,
  },
  tile: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
    padding: 8,
    justifyContent: "center",
    boxShadow: "0px 3px 0px #D8DFF2",
  },
  selected: { borderColor: blue, backgroundColor: "#F8FAFF" },
  option: {
    fontWeight: "700",
    color: ink,
    textAlign: "center",
    lineHeight: 21,
  },
  countryName: { flex: 1, fontWeight: "600", color: ink },
  accessTile: {
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  accessName: { color: ink, textAlign: "center", fontWeight: "500" },
  go: {
    backgroundColor: "#0018A8",
    borderRadius: 16,
    borderBottomWidth: 5,
    borderBottomColor: ink,
    padding: 10,
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  extraAction: { minHeight: 44, justifyContent: "center", marginTop: 8 },
});

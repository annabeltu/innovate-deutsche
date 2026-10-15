import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Rect } from "react-native-svg";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useApp } from "../state/useApp";
import { Txt } from "../components/ui";

const scenes = {
  US: require("../../assets/welcome/us.png"),
  MX: require("../../assets/welcome/mx.png"),
  KE: require("../../assets/welcome/ke.png"),
};
const stages = [
  ["Student", "🎒"],
  ["First job", "💼"],
  ["Parent", "🏡"],
  ["Retired", "🏖️🌿"],
] as const;

export function JourneySetup() {
  const s = useApp();
  const { t } = useTranslation();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 320 || fontScale > 1.5 || s.large;
  return (
    <View style={styles.screen}>
      <View style={styles.page}>
        <Image source={scenes[s.country]} resizeMode="cover" style={StyleSheet.absoluteFill} accessible={false} />
        <LinearGradient
          colors={["rgba(244,249,255,0.75)", "rgba(255,255,255,0.12)", s.country === "KE" ? "rgba(39,40,25,0.35)" : "rgba(245,243,250,0.45)"]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View accessibilityRole="header" accessibilityLabel="Deutsche Bank. Kompass">
            <View style={styles.brandRow}>
              <Svg width={25} height={25} viewBox="0 0 30 30" accessible={false}>
                <Rect x="2" y="2" width="26" height="26" stroke="#0012B3" strokeWidth="3" fill="none" />
                <Path d="M8 23 L18 7 H24 L14 23Z" fill="#0012B3" />
              </Svg>
              <Txt style={styles.bank}>Deutsche Bank</Txt>
            </View>
            <Txt style={styles.logo}>Kompass</Txt>
          </View>
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: 58 }} style={styles.track}>
            <View style={styles.progress} />
          </View>
          <View>
            <Txt accessibilityRole="header" style={styles.heading}>{t("where")}</Txt>
            <Txt style={[styles.heading, styles.highlight]}>{t("now")}</Txt>
          </View>
          <View style={styles.landscapeSpace} />
          <View style={styles.grid}>
            {stages.map(([stage, icon]) => (
              <Pressable
                key={stage}
                accessibilityRole="button"
                accessibilityLabel={stage}
                accessibilityState={{ selected: s.stage === stage }}
                onPress={() => s.set({ stage })}
                style={[styles.choice, { width: stacked ? "100%" : "48%" }, s.stage === stage && styles.selected]}
              >
                <Txt style={styles.emoji}>{icon}</Txt>
                <Txt style={styles.choiceLabel}>{stage}</Txt>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("continue")} onPress={() => router.push("/confidence")} style={styles.button}>
            <Txt style={styles.buttonLabel}>{t("continue")}</Txt>
            <Feather name="arrow-right" size={25} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#E8F0FF" },
  page: { flex: 1, width: "100%", maxWidth: 540, alignSelf: "center", overflow: "hidden" },
  scroll: { flex: 1, minHeight: 0 },
  content: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 26, paddingBottom: 16 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  bank: { color: "#0012B3", fontSize: 18, fontWeight: "700" },
  logo: { color: "#0012B3", fontSize: 36, lineHeight: 43, fontWeight: "800", letterSpacing: -1.8 },
  track: { height: 8, borderRadius: 8, backgroundColor: "#BCD6FF", marginTop: 20, marginBottom: 28, overflow: "hidden" },
  progress: { width: "58%", height: "100%", backgroundColor: "#0959FF", borderRadius: 8 },
  heading: { color: "#000C62", fontSize: 30, lineHeight: 35, fontWeight: "700", letterSpacing: -0.8 },
  highlight: { color: "#0951FF" },
  landscapeSpace: { flex: 1, minHeight: 115 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  choice: { minHeight: 112, backgroundColor: "rgba(255,255,255,0.94)", borderRadius: 20, borderWidth: 2, borderColor: "transparent", alignItems: "center", justifyContent: "center", padding: 12, gap: 8 },
  selected: { borderColor: "#0012B3", backgroundColor: "#E4EAFE" },
  emoji: { fontSize: 37, lineHeight: 47 },
  choiceLabel: { fontSize: 17, lineHeight: 25, fontWeight: "700", color: "#000C62", textAlign: "center" },
  footer: { flexShrink: 0, paddingHorizontal: 28, paddingTop: 18, paddingBottom: 28 },
  button: { minHeight: 62, borderRadius: 17, backgroundColor: "#0012B3", borderBottomWidth: 5, borderBottomColor: "#000C62", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, padding: 12 },
  buttonLabel: { color: "#FFFFFF", fontSize: 18, lineHeight: 26, fontWeight: "600" },
});

import { colors } from "../theme/tokens";
import "../../global.css";
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AccessibilityInfo, View } from "react-native";
import { useApp } from "../state/useApp";
import i18n from "../i18n";
export default function Layout() {
  const language = useApp((s) => s.language);
  useEffect(() => {
    void i18n.changeLanguage(language);
  }, [language]);
  useEffect(() => {
    void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (enabled) useApp.getState().set({ readAloud: true });
    });
  }, []);
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: colors.iceBlue }}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
      </View>
    </SafeAreaProvider>
  );
}

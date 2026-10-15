import * as Speech from "expo-speech";
import { colors } from "../theme/tokens";
import "../../global.css";
import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../api/query-client";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View } from "react-native";
import { useScreenReaderEnabled } from "../voice/use-screen-reader";
import { useApp } from "../state/useApp";
import i18n from "../i18n";
export default function Layout() {
  const language = useApp((s) => s.language);
  const [languageReady, setLanguageReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    const applySavedLanguage = () => {
      void i18n.changeLanguage(useApp.getState().language).then(() => {
        if (mounted) setLanguageReady(true);
      });
    };
    const unsubscribe = useApp.persist.onFinishHydration(applySavedLanguage);
    if (useApp.persist.hasHydrated()) applySavedLanguage();
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    void Speech.stop();
    void i18n.changeLanguage(language);
    if (typeof document !== "undefined")
      document.documentElement.lang = language;
  }, [language]);
  const screenReader = useScreenReaderEnabled();
  useEffect(() => {
    if (screenReader) useApp.getState().set({ readAloud: true });
  }, [screenReader]);
  if (!languageReady) return null;
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <View
          accessibilityLanguage={language}
          style={{ flex: 1, backgroundColor: colors.iceBlue }}
        >
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
        </View>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

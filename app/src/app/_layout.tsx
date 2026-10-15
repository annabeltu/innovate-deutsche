import "../../global.css";
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../api/query-client";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AccessibilityInfo } from "react-native";
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
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#E8F0FF" }}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
        </SafeAreaView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

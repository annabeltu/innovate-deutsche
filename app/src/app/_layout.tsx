import "../../global.css";
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../api/query-client";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useScreenReaderEnabled } from "../voice/use-screen-reader";
import { colors } from "../theme/tokens";
import { useApp } from "../state/useApp";
import i18n from "../i18n";
export default function Layout() {
  const language = useApp((s) => s.language);
  useEffect(() => {
    void i18n.changeLanguage(language);
  }, [language]);
  const screenReader = useScreenReaderEnabled();
  useEffect(() => {
    if (screenReader) useApp.getState().set({ readAloud: true });
  }, [screenReader]);
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.iceBlue }}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
        </SafeAreaView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

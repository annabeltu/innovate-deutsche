import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useApp } from "../state/useApp";
import { useNarration } from "../voice/narration";
import { speak, stopSpeaking } from "../voice/speech";
import { colors } from "../theme/tokens";

const BUBBLE_SIZE = 56;
const EDGE_GAP = 16;
const DOCK_GAP = 8;

/**
 * A slim strip holding the bubble at the bottom-right, placed between a
 * screen's content and its footer. It takes its own space, so it never covers
 * content and never moves the tab bar or main button. Pass `bottomInset` when
 * nothing sits below it, so it clears the home indicator.
 */
export function ReadAloudDock({
  bottomInset = false,
}: {
  bottomInset?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const enabled = useApp((s) => s.readAloud);
  if (!enabled) return null;
  return (
    <View
      style={{
        alignItems: "flex-end",
        paddingTop: DOCK_GAP,
        paddingBottom: DOCK_GAP + (bottomInset ? insets.bottom : 0),
        paddingRight: EDGE_GAP + insets.right,
      }}
    >
      <ReadAloudBubble />
    </View>
  );
}

/**
 * Round read-aloud button. Nothing is read until it is pressed; it reads the
 * screen in view in the selected language and turns into a stop button
 * while speaking.
 */
export function ReadAloudBubble() {
  const { t } = useTranslation();
  const enabled = useApp((s) => s.readAloud);
  const language = useApp((s) => s.language);
  const country = useApp((s) => s.country);
  const text = useNarration((s) => s.text);
  const speaking = useNarration((s) => s.speaking);
  if (!enabled) return null;
  const label = speaking ? t("voice.stopReading") : t("voice.readScreen");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={t("voice.readScreenHint")}
      accessibilityState={{ busy: speaking, disabled: !text }}
      disabled={!text}
      onPress={() =>
        speaking ? stopSpeaking() : void speak(text, { language, country })
      }
      style={({ pressed }) => [styles.bubble, { opacity: pressed ? 0.85 : 1 }]}
    >
      <Feather
        name={speaking ? "square" : "volume-2"}
        size={26}
        color={colors.white}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.deepBlue,
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: colors.darkBlue,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});

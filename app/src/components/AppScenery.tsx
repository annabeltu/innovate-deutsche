import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { useApp } from "../state/useApp";

const scenes = {
  US: require("../../assets/welcome/us.png"),
  MX: require("../../assets/welcome/mx.png"),
  KE: require("../../assets/welcome/ke.png"),
};

/**
 * Fill the parent with a background image. Uses a style, not className:
 * className sizing is ignored for Image on web, which rendered the scenery
 * at 1254px and widened the page on phones.
 */
export const SCENERY_FILL = StyleSheet.create({
  image: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
}).image;

/** Full-bleed country scenery with readable overlays for light and dark screens. */
export function AppScenery({ dark = false }: { dark?: boolean }) {
  const country = useApp((state) => state.country);
  return (
    <View pointerEvents="none" className="absolute inset-0">
      <Image
        source={scenes[country]}
        resizeMode="cover"
        accessible={false}
        testID="app-scenery-image"
        style={SCENERY_FILL}
      />
      <View
        className={`absolute inset-0 ${dark ? "bg-ink/80" : "bg-ice/80"}`}
      />
    </View>
  );
}

import React from "react";
import { Image, View } from "react-native";
import { useApp } from "../state/useApp";

const scenes = {
  US: require("../../assets/welcome/us.png"),
  MX: require("../../assets/welcome/mx.png"),
  KE: require("../../assets/welcome/ke.png"),
};

/** Full-bleed country scenery with readable overlays for light and dark screens. */
export function AppScenery({ dark = false }: { dark?: boolean }) {
  const country = useApp((state) => state.country);
  return (
    <View pointerEvents="none" className="absolute inset-0">
      <Image
        source={scenes[country]}
        resizeMode="cover"
        accessible={false}
        className="absolute h-full w-full"
      />
      <View
        className={`absolute inset-0 ${dark ? "bg-ink/80" : "bg-ice/80"}`}
      />
    </View>
  );
}

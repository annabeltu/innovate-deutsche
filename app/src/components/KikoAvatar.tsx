import React from "react";
import { Image, View } from "react-native";
import { useApp } from "../state/useApp";
import { ShopArt } from "./ShopArt";

/** Display the learner’s equipped outfit, or the transparent default Kiko. */
export function KikoAvatar({ size = 120 }: { size?: number }) {
  const outfit = useApp((state) => state.equippedOutfit);
  if (outfit)
    return (
      <View
        className="overflow-hidden rounded-full"
        style={{ width: size, height: size }}
      >
        <ShopArt
          kind={
            outfit === "outfit-asia"
              ? "asia"
              : outfit === "outfit-africa"
                ? "africa"
                : "europe"
          }
          width={size}
          height={size}
        />
      </View>
    );
  return (
    <Image
      source={require("../../assets/challenges/kiko-happy-transparent.png")}
      resizeMode="contain"
      accessible={false}
      style={{ width: size, height: size }}
    />
  );
}

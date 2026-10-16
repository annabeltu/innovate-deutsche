import React from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Image as SvgImage,
} from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/tokens";
import type { Topic } from "../types/api";
const illustration = require("../../assets/path/reference.png");
const SPRITE_WIDTH = 882;
const SPRITE_HEIGHT = 1783;
const ICON_BOX_ORIGIN = 18;
const ICON_BOX_SIZE = 64;
const BADGE_CENTER = 50;

type SpriteRegion = { x: number; y: number; width: number; height: number };
const regions: Record<Topic, SpriteRegion> = {
  accounts: { x: 148, y: 876, width: 126, height: 127 },
  saving: { x: 148, y: 701, width: 126, height: 127 },
  budget: { x: 148, y: 1061, width: 126, height: 127 },
  scams: { x: 142, y: 1234, width: 138, height: 150 },
  borrowing: { x: 148, y: 1431, width: 126, height: 127 },
};

/**
 * Where to draw the whole sprite so one region fills the badge's icon box,
 * scaled to fit and centred. Native react-native-svg ignores x/y on a nested
 * <Svg>, so cropping with a nested viewBox put the icon in the corner on iOS.
 */
export function spriteLayout(region: SpriteRegion) {
  const scale = Math.min(
    ICON_BOX_SIZE / region.width,
    ICON_BOX_SIZE / region.height,
  );
  const offset = (regionSize: number) =>
    ICON_BOX_ORIGIN + (ICON_BOX_SIZE - regionSize * scale) / 2;
  return {
    x: offset(region.width) - region.x * scale,
    y: offset(region.height) - region.y * scale,
    width: SPRITE_WIDTH * scale,
    height: SPRITE_HEIGHT * scale,
  };
}
/** Illustration medallion styled for the lesson’s progress state. */
export function Badge({
  topic,
  status,
  size,
}: {
  topic: Topic;
  status: string;
  size: number;
}) {
  const fill =
    status === "completed"
      ? colors.coinGold
      : status === "current"
        ? colors.brightBlue
        : colors.grey;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false}>
        <Circle
          cx={50}
          cy={50}
          r={48}
          fill={fill}
          stroke={status === "current" ? colors.deepBlue : colors.white}
          strokeWidth={2}
        />
        <Circle
          cx={50}
          cy={50}
          r={43}
          fill="none"
          stroke={colors.white}
          strokeWidth={2}
        />
        {status !== "locked" && (
          <>
            <Defs>
              <ClipPath id={`badge-icon-${topic}`}>
                <Circle
                  cx={BADGE_CENTER}
                  cy={BADGE_CENTER}
                  r={ICON_BOX_SIZE / 2}
                />
              </ClipPath>
            </Defs>
            <SvgImage
              testID={`badge-icon-${topic}`}
              href={illustration}
              clipPath={`url(#badge-icon-${topic})`}
              {...spriteLayout(regions[topic])}
            />
          </>
        )}
      </Svg>
      {status === "locked" && (
        <View className="absolute inset-0 items-center justify-center">
          <Feather name="lock" size={size * 0.4} color={colors.darkBlue} />
        </View>
      )}
    </View>
  );
}

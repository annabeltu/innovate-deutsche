import React from "react";
import Svg, { Image as SvgImage } from "react-native-svg";

const source = require("../../assets/shop/reference.png");
const regions = {
  freeze: "134 552 245 171",
  heart: "516 550 245 170",
  asia: "83 1035 222 191",
  africa: "336 1035 221 191",
  europe: "587 1035 223 191",
  globe: "105 1460 104 116",
};

/** Illustrations from the shop reference; labels and prices are native controls. */
export function ShopArt({
  kind,
  width = 90,
  height = width,
}: {
  kind: keyof typeof regions;
  width?: number;
  height?: number;
}) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox={regions[kind]}
      preserveAspectRatio="xMidYMid slice"
      accessible={false}
    >
      <SvgImage href={source} width={884} height={1779} />
    </Svg>
  );
}

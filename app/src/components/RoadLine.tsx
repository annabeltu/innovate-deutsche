import React, { useCallback, useMemo, useState } from "react";
import { LayoutChangeEvent, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../theme/tokens";
import { roadPath, RoadPoint } from "../onboarding/road-path";
import type { RoadLayout } from "./BonusLessons";

// Where the road enters at the top of the map, as a share of its width.
const ROAD_ENTRY_X = 0.15;
const ROAD_EDGE_WIDTH = 20;
const ROAD_SURFACE_WIDTH = 13;
const ROAD_DASH_WIDTH = 1.5;
const ROAD_DASH = "5 5";

/**
 * Collects the measured centre of every roadmap node (core and custom
 * lessons) and turns them into one road. Nodes report themselves on layout,
 * so the road follows the real rows at any text size or lesson count.
 */
export function useRoad(
  mapWidth: number,
  rowHeight: number,
  badgeSize: number,
) {
  const [nodes, setNodes] = useState<Record<string, RoadPoint>>({});
  const [height, setHeight] = useState(0);
  const onNode = useCallback((id: string, point: RoadPoint | null) => {
    setNodes((current) => {
      const previous = current[id];
      if (point === null) {
        if (!previous) return current;
        const { [id]: _removed, ...rest } = current;
        return rest;
      }
      if (previous && previous.x === point.x && previous.y === point.y)
        return current;
      return { ...current, [id]: point };
    });
  }, []);
  const onLayout = useCallback(
    (event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height),
    [],
  );
  const path = useMemo(() => {
    const stops = Object.values(nodes).sort((a, b) => a.y - b.y);
    if (stops.length === 0) return "";
    const last = stops[stops.length - 1];
    // Enter from the top edge and run off the bottom edge past the last node.
    return roadPath([
      { x: mapWidth * ROAD_ENTRY_X, y: 0 },
      ...stops,
      { x: last.x, y: Math.max(height, last.y) },
    ]);
  }, [nodes, height, mapWidth]);
  const layout: RoadLayout = { mapWidth, rowHeight, badgeSize, onNode };
  return { path, onLayout, layout };
}

/** The road drawn behind the roadmap nodes. */
export function RoadLine({ d }: { d: string }) {
  if (!d) return null;
  return (
    <View pointerEvents="none" className="absolute inset-0">
      <Svg width="100%" height="100%" accessible={false}>
        <Path
          d={d}
          fill="none"
          stroke={colors.lightBlue}
          strokeWidth={ROAD_EDGE_WIDTH}
          strokeLinecap="round"
        />
        <Path
          d={d}
          fill="none"
          stroke={colors.white}
          strokeWidth={ROAD_SURFACE_WIDTH}
          strokeLinecap="round"
        />
        <Path
          d={d}
          fill="none"
          stroke={colors.brightBlue}
          strokeWidth={ROAD_DASH_WIDTH}
          strokeDasharray={ROAD_DASH}
        />
      </Svg>
    </View>
  );
}

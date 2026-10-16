export type RoadPoint = { x: number; y: number };

// Catmull-Rom to cubic Bézier: each control point sits a sixth of the way
// along the line between a point's neighbours.
const SMOOTHING = 6;

/**
 * A smooth SVG path that passes through every point in order, so the
 * roadmap road always runs through each lesson node however many there are.
 */
export function roadPath(points: RoadPoint[]): string {
  if (points.length < 2) return "";
  const at = (index: number) =>
    points[Math.min(Math.max(index, 0), points.length - 1)];
  const segments = points.slice(1).map((end, offset) => {
    const index = offset + 1;
    const start = at(index - 1);
    const before = at(index - 2);
    const after = at(index + 1);
    const first = {
      x: start.x + (end.x - before.x) / SMOOTHING,
      y: start.y + (end.y - before.y) / SMOOTHING,
    };
    const second = {
      x: end.x - (after.x - start.x) / SMOOTHING,
      y: end.y - (after.y - start.y) / SMOOTHING,
    };
    return `C ${first.x} ${first.y}, ${second.x} ${second.y}, ${end.x} ${end.y}`;
  });
  return `M ${points[0].x} ${points[0].y} ${segments.join(" ")}`;
}

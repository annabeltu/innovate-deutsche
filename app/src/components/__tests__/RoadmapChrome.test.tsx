import { spriteLayout } from "../RoadmapChrome";

const ICON_BOX = { start: 18, end: 82 };

describe("spriteLayout", () => {
  it.each([
    ["square region", { x: 148, y: 701, width: 126, height: 127 }],
    ["tall region", { x: 142, y: 1234, width: 138, height: 150 }],
  ])("places a %s inside the badge's icon box", (_name, region) => {
    const layout = spriteLayout(region);
    const scale = layout.width / 882;

    const left = layout.x + region.x * scale;
    const top = layout.y + region.y * scale;
    const right = left + region.width * scale;
    const bottom = top + region.height * scale;

    expect(left).toBeGreaterThanOrEqual(ICON_BOX.start - 1e-9);
    expect(top).toBeGreaterThanOrEqual(ICON_BOX.start - 1e-9);
    expect(right).toBeLessThanOrEqual(ICON_BOX.end + 1e-9);
    expect(bottom).toBeLessThanOrEqual(ICON_BOX.end + 1e-9);
    expect((left + right) / 2).toBeCloseTo(50);
    expect((top + bottom) / 2).toBeCloseTo(50);
  });
});

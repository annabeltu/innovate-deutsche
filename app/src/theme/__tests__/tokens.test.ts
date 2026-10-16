import { alpha, colors } from "../tokens";

it("turns a token into a translucent rgba color", () => {
  expect(alpha(colors.iceBlue, 0.75)).toBe("rgba(232,240,255,0.75)");
});

it("keeps full opacity at 1", () => {
  expect(alpha(colors.darkBlue, 1)).toBe("rgba(0,14,92,1)");
});

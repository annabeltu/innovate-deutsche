// Kompass brand tokens. The UI chrome always uses these blues.
export const colors = {
  deepBlue: "#0018A8",
  darkBlue: "#000E5C",
  midBlue: "#2A5BD7",
  // Top of the dark screen gradient.
  duskBlue: "#294DB3",
  brightBlue: "#3D8BFF",
  lightBlue: "#A9C8FF",
  iceBlue: "#E8F0FF",
  grey: "#C9D1E0",
  white: "#FFFFFF",
  welcomePanel: "#F5F7FE",
  welcomePanelTransparent: "rgba(245,247,254,0)",
  success: "#1FA463",
  successSoft: "#EAF8EF",
  error: "#E5484D",
  errorSoft: "#FFF1F1",
  warningSurface: "#FFE4DE",
  successSurface: "#E1F5ED",
  successText: "#076835",
  errorText: "#A51D24",
  coinGold: "#F5B700",
  coinGoldSoft: "#FFF5CF",
  // Readable gold text on white or coinGoldSoft (contrast >= 4.5:1).
  coinGoldText: "#8C6200",
  // Readable warning text on dark backgrounds.
  noticeOnDark: "#FFE08A",
} as const;

// Country scenery accents; interface controls retain the brand blues.
export const regionAccents = {
  US: "#739FD5", // United States
  KE: "#E0A82E", // Kenya
  MX: "#59A995", // Mexico
} as const;

export type ColorToken = keyof typeof colors;
export type CountryCode = keyof typeof regionAccents;

// Spacing scale (pt). Layout uses only these values.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const layout = {
  /** Horizontal page padding, applied once by Screen. */
  pagePadding: spacing.xl,
  /** Gap between sections of a screen. */
  sectionGap: spacing.xl,
  /** Gap between items inside a section, answer options and stacked actions. */
  itemGap: spacing.md,
  /** Reading column width on tablets and web. */
  maxContentWidth: 540,
} as const;

export const radii = {
  option: 18,
  button: 20,
  card: 24,
  pill: 999,
} as const;

/** Chunky bottom border that marks a surface as pressable. */
export const depth = {
  button: 6,
  option: 4,
  card: 5,
} as const;

export const minTapTarget = 48;

type TypeStyle = {
  fontSize: number;
  lineHeight: number;
  largeFontSize: number;
  largeLineHeight: number;
  fontWeight: "400" | "500" | "600" | "700";
};

// Fixed type scale; "large" sizes apply when the learner turns on larger text.
export const typeScale = {
  title: {
    fontSize: 36,
    lineHeight: 42,
    largeFontSize: 40,
    largeLineHeight: 48,
    fontWeight: "500",
  },
  heading: {
    fontSize: 22,
    lineHeight: 28,
    largeFontSize: 26,
    largeLineHeight: 32,
    fontWeight: "700",
  },
  subheading: {
    fontSize: 18,
    lineHeight: 26,
    largeFontSize: 21,
    largeLineHeight: 30,
    fontWeight: "700",
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    largeFontSize: 19,
    largeLineHeight: 28,
    fontWeight: "400",
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    largeFontSize: 17,
    largeLineHeight: 24,
    fontWeight: "400",
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    largeFontSize: 14,
    largeLineHeight: 20,
    fontWeight: "700",
  },
} as const satisfies Record<string, TypeStyle>;

export type TypeVariant = keyof typeof typeScale;

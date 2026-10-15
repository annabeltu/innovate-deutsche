// Kompass brand tokens. The UI chrome always uses these blues.
export const colors = {
  deepBlue: "#0018A8",
  darkBlue: "#000E5C",
  midBlue: "#2A5BD7",
  brightBlue: "#3D8BFF",
  lightBlue: "#A9C8FF",
  iceBlue: "#E8F0FF",
  grey: "#C9D1E0",
  white: "#FFFFFF",
  success: "#1FA463",
  successSoft: "#EAF8EF",
  error: "#E5484D",
  errorSoft: "#FFF1F1",
  coinGold: "#F5B700",
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

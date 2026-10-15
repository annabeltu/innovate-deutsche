module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        warning: require("./src/theme/tokens.ts").colors.warningSurface,
        positiveSurface: require("./src/theme/tokens.ts").colors.successSurface,
        positive: require("./src/theme/tokens.ts").colors.successText,
        danger: require("./src/theme/tokens.ts").colors.errorText,
        brand: require("./src/theme/tokens.ts").colors.deepBlue,
        ink: require("./src/theme/tokens.ts").colors.darkBlue,
        ice: require("./src/theme/tokens.ts").colors.iceBlue,
      },
    },
  },
  plugins: [],
};

const { colors } = require("./src/theme/tokens.ts");

// Every color comes from src/theme/tokens.ts; the aliases keep existing class names.
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ...colors,
        warning: colors.warningSurface,
        positiveSurface: colors.successSurface,
        positive: colors.successText,
        danger: colors.errorText,
        brand: colors.deepBlue,
        ink: colors.darkBlue,
        ice: colors.iceBlue,
      },
    },
  },
  plugins: [],
};

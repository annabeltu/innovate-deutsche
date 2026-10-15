module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: require("./src/theme/tokens.ts").colors.deepBlue,
        ink: require("./src/theme/tokens.ts").colors.darkBlue,
        ice: require("./src/theme/tokens.ts").colors.iceBlue,
      },
    },
  },
  plugins: [],
};

module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: { colors: { brand: "#0018A8", ink: "#000E5C", ice: "#E8F0FF" } },
  },
  plugins: [],
};

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxImportSource: "nativewind",
          // Zustand's ESM build reads import.meta.env, which is a SyntaxError in
          // the classic script the web bundle loads as; without this the web app
          // never starts and shows only the pre-rendered HTML.
          unstable_transformImportMeta: true,
        },
      ],
      "nativewind/babel",
    ],
  };
};

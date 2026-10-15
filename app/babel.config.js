module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxImportSource: "nativewind",
          // zustand's middleware uses import.meta, which breaks the classic
          // web bundle unless it is rewritten for every platform.
          unstable_transformImportMeta: true,
        },
      ],
      "nativewind/babel",
    ],
  };
};

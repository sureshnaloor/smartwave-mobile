const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Polyfill Node core modules so qrcode/lib/server (pngjs) can run in React Native
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  assert: require.resolve("assert/"),
  buffer: require.resolve("buffer/"),
  util: require.resolve("util/"),
  stream: require.resolve("readable-stream"),
  zlib: require.resolve("browserify-zlib"),
};

module.exports = config;

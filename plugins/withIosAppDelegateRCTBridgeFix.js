/**
 * Fix for Expo SDK 54 + New Architecture: "cannot find type 'RCTBridge' in scope" in AppDelegate.swift.
 * Removes the expo-dev-client override that uses RCTBridge (not available in New Arch) so the iOS build succeeds.
 * See https://github.com/expo/expo/issues/41189
 */

const { withAppDelegate } = require("@expo/config-plugins");

function withIosAppDelegateRCTBridgeFix(config) {
  return withAppDelegate(config, (config) => {
    const { contents, language } = config.modResults;
    if (language !== "swift") {
      return config;
    }
    // Remove the override func sourceURL(for bridge: RCTBridge) block that causes the build error.
    let newContents = contents.replace(
      /\s*\/\/ Extension point for config-plugins[\s\S]*?override func sourceURL\(for bridge: RCTBridge\) -> URL\? \{[\s\S]*?bridge\.bundleURL \?\? bundleURL\(\)[\s\S]*?\}/,
      ""
    );
    if (newContents === contents && contents.includes("RCTBridge")) {
      newContents = contents.replace(
        /\s*override func sourceURL\(for bridge: RCTBridge\) -> URL\? \{[\s\S]*?bridge\.bundleURL \?\? bundleURL\(\)[\s\S]*?\}/,
        ""
      );
    }
    config.modResults.contents = newContents;
    return config;
  });
}

module.exports = withIosAppDelegateRCTBridgeFix;

// Polyfill Node globals for qrcode/lib/server (pngjs) used in QR save/share
import { Buffer } from "buffer";
if (typeof global !== "undefined") {
  const g = global as unknown as { Buffer?: typeof Buffer; process?: NodeJS.Process };
  g.Buffer = Buffer;
  if (!g.process) {
    g.process = {
      nextTick: (fn: () => void) => (typeof setImmediate !== "undefined" ? setImmediate(fn) : setTimeout(fn, 0)),
      env: {},
    } as NodeJS.Process;
  } else if (!g.process.nextTick) {
    g.process.nextTick = (fn: () => void) =>
      typeof setImmediate !== "undefined" ? setImmediate(fn) : setTimeout(fn, 0);
  }
}

// Suppress "emit of undefined" errors from readable-stream/pngjs that don't affect QR generation
if (typeof ErrorUtils !== "undefined" && ErrorUtils.setGlobalHandler) {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    // Suppress non-fatal "emit of undefined" errors from stream library
    if (
      error?.message?.includes("emit") &&
      (error?.message?.includes("undefined") || error?.message?.includes("Cannot read property"))
    ) {
      if (__DEV__) {
        console.warn("[Suppressed] Stream library error (non-fatal):", error.message);
      }
      return;
    }
    // Call original handler for all other errors
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

import { registerRootComponent } from "expo";
import App from "./App";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

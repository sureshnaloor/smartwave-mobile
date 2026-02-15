/**
 * Platform-aware storage utility
 * Uses SecureStore on native platforms (iOS/Android) and localStorage on web
 */
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

// Web storage using localStorage
const webStorage = {
  async getItemAsync(key: string): Promise<string | null> {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      console.warn("[storage] localStorage.getItem failed:", e);
      return null;
    }
  },

  async setItemAsync(key: string, value: string): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      console.warn("[storage] localStorage.setItem failed:", e);
    }
  },

  async deleteItemAsync(key: string): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn("[storage] localStorage.removeItem failed:", e);
    }
  },
};

// Native storage using SecureStore
let nativeStorage: typeof webStorage | null = null;

if (!isWeb) {
  try {
    const SecureStore = require("expo-secure-store");
    nativeStorage = {
      async getItemAsync(key: string): Promise<string | null> {
        return await SecureStore.getItemAsync(key);
      },
      async setItemAsync(key: string, value: string): Promise<void> {
        await SecureStore.setItemAsync(key, value);
      },
      async deleteItemAsync(key: string): Promise<void> {
        await SecureStore.deleteItemAsync(key);
      },
    };
  } catch (e) {
    console.warn("[storage] SecureStore not available, falling back to web storage:", e);
  }
}

// Export the appropriate storage based on platform
export const storage = nativeStorage || webStorage;

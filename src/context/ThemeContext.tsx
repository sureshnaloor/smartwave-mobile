import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

const THEME_KEY = "smartwave_theme";
const FONT_SCALE_KEY = "smartwave_font_scale";

export type Theme = "light" | "dark";
export type FontScaleKey = "small" | "default" | "large";

const FONT_SCALE_MAP: Record<FontScaleKey, number> = {
  small: 0.9,
  default: 1,
  large: 1.2,
};

type ThemeContextType = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  fontScaleKey: FontScaleKey;
  fontScale: number;
  setFontScaleKey: (k: FontScaleKey) => void;
  colors: {
    background: string;
    card: string;
    text: string;
    textMuted: string;
    border: string;
    primary: string;
    error: string;
  };
};

const darkColors = {
  background: "#0f172a",
  card: "#1e293b",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  border: "#334155",
  primary: "#3b82f6",
  error: "#f87171",
};

const lightColors = {
  background: "#f1f5f9",
  card: "#ffffff",
  text: "#0f172a",
  textMuted: "#64748b",
  border: "#e2e8f0",
  primary: "#2563eb",
  error: "#dc2626",
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [fontScaleKey, setFontScaleKeyState] = useState<FontScaleKey>("default");
  useEffect(() => {
    (async () => {
      try {
        const [savedTheme, savedFont] = await Promise.all([
          SecureStore.getItemAsync(THEME_KEY),
          SecureStore.getItemAsync(FONT_SCALE_KEY),
        ]);
        if (savedTheme === "light" || savedTheme === "dark") setThemeState(savedTheme);
        if (savedFont === "small" || savedFont === "default" || savedFont === "large") setFontScaleKeyState(savedFont);
      } catch (_) {}
    })();
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    SecureStore.setItemAsync(THEME_KEY, t);
  };

  const setFontScaleKey = (k: FontScaleKey) => {
    setFontScaleKeyState(k);
    SecureStore.setItemAsync(FONT_SCALE_KEY, k);
  };

  const colors = theme === "dark" ? darkColors : lightColors;
  const fontScale = FONT_SCALE_MAP[fontScaleKey];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        fontScaleKey,
        fontScale,
        setFontScaleKey,
        colors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

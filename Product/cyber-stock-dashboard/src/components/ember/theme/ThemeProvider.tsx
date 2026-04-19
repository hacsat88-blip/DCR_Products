"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type EmberTheme = "light" | "dark";

type ThemeContextValue = {
  theme: EmberTheme;
  setTheme: (next: EmberTheme) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = "ember-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialTheme(): EmberTheme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<EmberTheme>("light");

  useEffect(() => {
    const initial = readInitialTheme();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  const setTheme = useCallback((next: EmberTheme) => {
    setThemeState(next);
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [setTheme, theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useEmberTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "light",
      setTheme: () => undefined,
      toggleTheme: () => undefined,
    };
  }
  return ctx;
}

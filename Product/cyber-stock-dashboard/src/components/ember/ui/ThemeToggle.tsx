"use client";

import React from "react";
import { useEmberTheme } from "@/components/ember/theme/ThemeProvider";

/** Props for the theme toggle icon button. */
export interface ThemeToggleProps {
  /** Accessible label for the button. Default "テーマ切替". */
  label?: string;
}

export function ThemeToggle({ label = "テーマ切替" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useEmberTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      style={{
        width: 36,
        height: 36,
        borderRadius: 9999,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: "var(--ink-soft)",
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        transition: "background 0.2s, color 0.2s",
        flexShrink: 0,
      }}
    >
      {isDark ? (
        /* Sun icon shown in dark mode */
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        /* Moon icon shown in light mode */
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      )}
    </button>
  );
}

"use client";

import React from "react";

/** A single tab item descriptor. */
export interface TabItem {
  id: string;
  label: string;
  /** Optional Japanese label rendered in smaller text inside the pill. */
  jp?: string;
}

/** Props for the pill-style tab bar. */
export interface TabsProps {
  /** Array of tab descriptors to render. */
  tabs: TabItem[];
  /** ID of the currently active tab. */
  current: string;
  /** Called with the new tab ID when the user clicks a tab. */
  onChange: (id: string) => void;
}

const BASE_PILL: React.CSSProperties = {
  padding: "8px 18px",
  borderRadius: 9999,
  border: "none",
  fontSize: 13,
  cursor: "pointer",
  lineHeight: 1.2,
  transition: "all 0.2s",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};

export function Tabs({ tabs, current, onChange }: TabsProps) {
  return (
    <nav
      aria-label="メインナビゲーション"
      style={{
        display: "inline-flex",
        gap: 4,
        padding: 4,
        background: "var(--bg-2)",
        borderRadius: 9999,
        border: "1px solid var(--border)",
      }}
    >
      {tabs.map((t) => {
        const active = t.id === current;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            aria-current={active ? "page" : undefined}
            style={{
              ...BASE_PILL,
              background: active ? "var(--coral)" : "transparent",
              color: active ? "#ffffff" : "var(--ink-soft)",
              fontWeight: active ? 600 : 500,
            }}
          >
            {t.label}
            {t.jp && (
              <span style={{ fontSize: 11, opacity: 0.75 }}>{t.jp}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

"use client";

import React from "react";

/** Default time-period options for the switcher. */
export const PERIOD_OPTIONS = [
  { id: "1M",  label: "1M"  },
  { id: "3M",  label: "3M"  },
  { id: "6M",  label: "6M"  },
  { id: "1Y",  label: "1Y"  },
  { id: "5Y",  label: "5Y"  },
  { id: "ALL", label: "ALL" },
] as const;

export type PeriodId = (typeof PERIOD_OPTIONS)[number]["id"];

/** Props for the pill segmented period control. */
export interface PeriodSwitcherProps {
  /** Currently selected period id. */
  value: string;
  /** Called with the new period id when selection changes. */
  onChange: (v: string) => void;
  /** Option list. Defaults to PERIOD_OPTIONS. */
  options?: readonly { id: string; label: string }[];
}

export function PeriodSwitcher({
  value,
  onChange,
  options = PERIOD_OPTIONS,
}: PeriodSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="期間選択"
      style={{
        display: "inline-flex",
        gap: 2,
        padding: 3,
        background: "var(--bg-2)",
        borderRadius: 9999,
        border: "1px solid var(--border)",
      }}
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            style={{
              padding: "5px 12px",
              borderRadius: 9999,
              border: "none",
              background: active ? "var(--coral)" : "transparent",
              color: active ? "#ffffff" : "var(--ink-soft)",
              fontSize: 11,
              fontWeight: active ? 600 : 500,
              cursor: "pointer",
              transition: "all 0.15s",
              lineHeight: 1,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

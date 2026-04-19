"use client";

import React from "react";

export type ChartMode = "line" | "area" | "candle";

const ICON_W = 20;
const ICON_H = 14;

function LineIcon({ active }: { active: boolean }) {
  const stroke = active ? "#fff" : "currentColor";
  return (
    <svg width={ICON_W} height={ICON_H} viewBox="0 0 20 14" fill="none" aria-hidden>
      <polyline
        points="1,12 6,7 10,9 14,4 19,2"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AreaIcon({ active }: { active: boolean }) {
  const stroke = active ? "#fff" : "currentColor";
  const fill = active ? "#fff" : "currentColor";
  return (
    <svg width={ICON_W} height={ICON_H} viewBox="0 0 20 14" fill="none" aria-hidden>
      <path
        d="M1,12 L6,7 L10,9 L14,4 L19,2 L19,13 L1,13 Z"
        fill={fill}
        fillOpacity={0.22}
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CandleIcon({ active }: { active: boolean }) {
  const col = active ? "#fff" : "currentColor";
  return (
    <svg width={ICON_W} height={ICON_H} viewBox="0 0 20 14" fill="none" aria-hidden>
      {/* Candle 1 — bullish */}
      <rect x="2" y="4" width="3" height="7" rx="0.5" fill={col} />
      <line x1="3.5" y1="2"  x2="3.5" y2="4"  stroke={col} strokeWidth="1.2" />
      <line x1="3.5" y1="11" x2="3.5" y2="13" stroke={col} strokeWidth="1.2" />
      {/* Candle 2 — bearish (hollow) */}
      <rect x="9" y="6" width="3" height="5" rx="0.5" fill={col} fillOpacity={0.25} stroke={col} strokeWidth="1" />
      <line x1="10.5" y1="3"  x2="10.5" y2="6"  stroke={col} strokeWidth="1.2" />
      <line x1="10.5" y1="11" x2="10.5" y2="13" stroke={col} strokeWidth="1.2" />
      {/* Candle 3 — bullish */}
      <rect x="15" y="3" width="3" height="8" rx="0.5" fill={col} />
      <line x1="16.5" y1="1"  x2="16.5" y2="3"  stroke={col} strokeWidth="1.2" />
      <line x1="16.5" y1="11" x2="16.5" y2="13" stroke={col} strokeWidth="1.2" />
    </svg>
  );
}

const MODES: { id: ChartMode; label: string }[] = [
  { id: "line",   label: "Line"   },
  { id: "area",   label: "Area"   },
  { id: "candle", label: "Candle" },
];

/** Props for the chart mode segmented control. */
export interface ChartModeSwitcherProps {
  /** Currently active chart mode. */
  value: ChartMode;
  /** Called when the user selects a new mode. */
  onChange: (v: ChartMode) => void;
  /** Whether the candle option is shown. Default true. */
  allowCandle?: boolean;
}

export function ChartModeSwitcher({
  value,
  onChange,
  allowCandle = true,
}: ChartModeSwitcherProps) {
  const modes = allowCandle ? MODES : MODES.filter((m) => m.id !== "candle");

  return (
    <div
      role="group"
      aria-label="チャートモード"
      style={{
        display: "inline-flex",
        gap: 2,
        padding: 3,
        background: "var(--bg-2)",
        borderRadius: 9999,
        border: "1px solid var(--border)",
      }}
    >
      {modes.map((m) => {
        const active = m.id === value;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            aria-pressed={active}
            title={m.label}
            aria-label={m.label}
            style={{
              padding: "5px 10px",
              borderRadius: 9999,
              border: "none",
              background: active ? "var(--coral)" : "transparent",
              color: active ? "#ffffff" : "var(--ink-soft)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
            }}
          >
            {m.id === "line"   && <LineIcon   active={active} />}
            {m.id === "area"   && <AreaIcon   active={active} />}
            {m.id === "candle" && <CandleIcon active={active} />}
          </button>
        );
      })}
    </div>
  );
}

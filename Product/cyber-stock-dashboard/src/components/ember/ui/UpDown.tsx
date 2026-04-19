import React from "react";

const SIZE_MAP = {
  sm: { font: 12, arrow: 10 },
  md: { font: 14, arrow: 12 },
} as const;

/** Props for the inline up/down change indicator. */
export interface UpDownProps {
  /** Numeric change value. Positive → ▲ up-color, negative → ▼ down-color, zero → ink-soft. */
  value: number;
  /** Optional suffix appended after the formatted number (e.g. "%"). */
  suffix?: string;
  /** Font size variant. Default "sm". */
  size?: "sm" | "md";
  /** Render in monospace font. Default true. */
  mono?: boolean;
}

export function UpDown({ value, suffix, size = "sm", mono = true }: UpDownProps) {
  const { font, arrow } = SIZE_MAP[size];
  const isUp = value > 0;
  const isDown = value < 0;

  const color = isUp ? "var(--up)" : isDown ? "var(--down)" : "var(--ink-soft)";
  const formatted = `${Math.abs(value).toFixed(2)}${suffix ?? ""}`;

  return (
    <span
      className={mono ? "font-mono" : undefined}
      style={{
        color,
        fontSize: font,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
      }}
    >
      {isUp && <span style={{ fontSize: arrow }}>▲</span>}
      {isDown && <span style={{ fontSize: arrow }}>▼</span>}
      {formatted}
    </span>
  );
}

import React from "react";

/** Named sectors map to fixed palette colors. */
const NAMED_COLORS: Record<string, string> = {
  "自動車": "var(--coral)",
  "電機":   "var(--plum)",
  "通信":   "var(--clay)",
  "金融":   "var(--moss)",
  "化学":   "var(--coral-2)",
  "サービス": "var(--sage)",
};

/** Cyclic palette for unlisted sectors. */
const CYCLE: readonly string[] = [
  "var(--coral)",
  "var(--clay)",
  "var(--plum)",
  "var(--sage)",
  "var(--moss)",
  "var(--coral-deep)",
];

/**
 * Returns a deterministic CSS color string for a given sector name.
 * Named Japanese sectors use fixed colors; all others cycle through the palette.
 */
export function sectorColor(sector: string): string {
  if (NAMED_COLORS[sector]) return NAMED_COLORS[sector];
  let hash = 0;
  for (let i = 0; i < sector.length; i++) {
    hash = ((hash * 31) + sector.charCodeAt(i)) >>> 0;
  }
  return CYCLE[hash % CYCLE.length];
}

/** Props for the small sector color dot. */
export interface SectorDotProps {
  /** Sector name used to derive a deterministic color. */
  sector: string;
  /** Dot diameter in px. Default 8. */
  size?: number;
}

export function SectorDot({ sector, size = 8 }: SectorDotProps) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: 9999,
        background: sectorColor(sector),
        flexShrink: 0,
      }}
    />
  );
}

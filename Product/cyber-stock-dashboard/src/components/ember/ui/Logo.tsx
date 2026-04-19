import React from "react";

/** Props for the Ember logo mark. */
export interface LogoProps {
  /** Overall size in px applied to the SVG mark; text scales proportionally. Default 28. */
  size?: number;
}

export function Logo({ size = 28 }: LogoProps) {
  const scale = size / 28;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
        <defs>
          <linearGradient id="lg-coral-logo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--coral)" />
            <stop offset="1" stopColor="var(--coral-2)" />
          </linearGradient>
        </defs>
        <path
          d="M14 3 C 7 3, 3 8, 3 14 C 3 20, 7 25, 14 25 C 19 25, 23 22, 24 17 L 17 17 C 16 19, 14 20, 12 20 C 9 20, 7 17, 7 14 C 7 11, 9 8, 12 8 C 14 8, 16 9, 17 11 L 24 11 C 23 6, 19 3, 14 3 Z"
          fill="url(#lg-coral-logo)"
        />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span
          className="font-serif text-ink"
          style={{ fontSize: Math.round(18 * scale) }}
        >
          Ember
        </span>
        <span
          className="text-ink-mute"
          style={{
            fontSize: Math.round(9 * scale),
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginTop: 2,
          }}
        >
          Stock Atelier
        </span>
      </div>
    </div>
  );
}

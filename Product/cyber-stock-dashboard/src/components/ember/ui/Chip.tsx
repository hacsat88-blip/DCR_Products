import React from "react";

type Tone = "default" | "coral" | "plum" | "sage" | "clay";

const TONE_STYLES: Record<
  Tone,
  { background: string; color: string; borderColor: string }
> = {
  default: {
    background: "var(--bg-2)",
    color:      "var(--ink-soft)",
    borderColor: "var(--border)",
  },
  coral: {
    background: "rgba(217,119,87,0.12)",
    color:      "var(--coral-deep)",
    borderColor: "rgba(217,119,87,0.25)",
  },
  plum: {
    background: "rgba(123,94,140,0.10)",
    color:      "var(--plum)",
    borderColor: "rgba(123,94,140,0.20)",
  },
  sage: {
    background: "rgba(122,142,107,0.12)",
    color:      "var(--sage)",
    borderColor: "rgba(122,142,107,0.22)",
  },
  clay: {
    background: "rgba(200,155,107,0.12)",
    color:      "var(--clay)",
    borderColor: "rgba(200,155,107,0.22)",
  },
};

/** Props for the Ember chip inline label. */
export interface ChipProps {
  children: React.ReactNode;
  /** Color tone variant that adjusts background and text accent. Default "default". */
  tone?: Tone;
}

export function Chip({ children, tone = "default" }: ChipProps) {
  const ts = TONE_STYLES[tone];
  return (
    <span
      className="ember-chip"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 9999,
        fontSize: 11,
        letterSpacing: "0.04em",
        background: ts.background,
        color: ts.color,
        border: `1px solid ${ts.borderColor}`,
      }}
    >
      {children}
    </span>
  );
}

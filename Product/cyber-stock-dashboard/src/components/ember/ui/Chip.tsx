import React from "react";

type Tone = "default" | "coral" | "plum" | "sage" | "clay" | "moss" | "ink";

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
    background: "color-mix(in srgb, var(--coral) 12%, transparent)",
    color:      "var(--coral-deep)",
    borderColor: "color-mix(in srgb, var(--coral) 25%, transparent)",
  },
  plum: {
    background: "color-mix(in srgb, var(--plum) 10%, transparent)",
    color:      "var(--plum)",
    borderColor: "color-mix(in srgb, var(--plum) 20%, transparent)",
  },
  sage: {
    background: "color-mix(in srgb, var(--sage) 12%, transparent)",
    color:      "var(--sage)",
    borderColor: "color-mix(in srgb, var(--sage) 22%, transparent)",
  },
  clay: {
    background: "color-mix(in srgb, var(--clay) 12%, transparent)",
    color:      "var(--clay)",
    borderColor: "color-mix(in srgb, var(--clay) 22%, transparent)",
  },
  moss: {
    background: "color-mix(in srgb, var(--moss) 12%, transparent)",
    color:      "var(--moss)",
    borderColor: "color-mix(in srgb, var(--moss) 22%, transparent)",
  },
  ink: {
    background: "color-mix(in srgb, var(--ink) 8%, transparent)",
    color:      "var(--ink)",
    borderColor: "color-mix(in srgb, var(--ink) 15%, transparent)",
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

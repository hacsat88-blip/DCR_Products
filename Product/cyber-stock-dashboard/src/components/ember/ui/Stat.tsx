import React from "react";

/** Props for a vertical stat display block. */
export interface StatProps {
  /** Uppercase label rendered above the primary value. */
  label: string;
  /** Primary value — string, number, or any React node. */
  value: React.ReactNode;
  /** Optional supplementary note below the value. */
  sub?: React.ReactNode;
  /** Text alignment within the block. Default "left". */
  align?: "left" | "right";
  /** Render the value in monospace (24 px) instead of serif (28 px). Default false. */
  mono?: boolean;
}

export function Stat({ label, value, sub, align = "left", mono = false }: StatProps) {
  return (
    <div style={{ textAlign: align }}>
      <div
        className="text-ink-mute"
        style={{
          fontSize: 10,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        className={mono ? "font-mono" : "font-serif"}
        style={{
          fontSize: mono ? 24 : 28,
          color: "var(--ink)",
          fontWeight: 500,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub != null && (
        <div
          className="text-ink-mute"
          style={{ fontSize: 11, marginTop: 6 }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

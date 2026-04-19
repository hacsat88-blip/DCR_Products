import React from "react";

/** Props for a section header block with eyebrow, title, Japanese subtitle, and optional right slot. */
export interface SectionHeadProps {
  /** Small uppercase eyebrow label shown above the title. */
  eyebrow?: string;
  /** Main section title rendered in serif. */
  title: string;
  /** Japanese subtitle rendered below the title in serif at reduced size. */
  jp?: string;
  /** Optional content floated to the right (e.g. a PeriodSwitcher or action button). */
  right?: React.ReactNode;
}

export function SectionHead({ eyebrow, title, jp, right }: SectionHeadProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div>
        {eyebrow && (
          <div
            className="text-ink-mute"
            style={{
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            {eyebrow}
          </div>
        )}
        <h2
          className="font-serif text-ink"
          style={{ margin: 0, fontSize: 32, fontWeight: 400, lineHeight: 1.15 }}
        >
          {title}
        </h2>
        {jp && (
          <p
            className="font-serif text-ink-soft"
            style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 400 }}
          >
            {jp}
          </p>
        )}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

import React from "react";

/** Props for the decorative blurred gradient blob. */
export interface BlobProps {
  /** CSS color string for the blob center. Defaults to "var(--coral)". */
  color?: string;
  /** Width and height of the blob in px. Default 220. */
  size?: number;
  /** CSS top position. */
  top?: string;
  /** CSS left position. */
  left?: string;
  /** CSS right position. */
  right?: string;
  /** CSS bottom position. */
  bottom?: string;
  /** Opacity between 0 and 1. Default 0.5. */
  opacity?: number;
}

export function Blob({
  color = "var(--coral)",
  size = 220,
  top,
  left,
  right,
  bottom,
  opacity = 0.5,
}: BlobProps) {
  return (
    <div
      aria-hidden
      className="ember-blob"
      style={{
        position: "absolute",
        top,
        left,
        right,
        bottom,
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color}, transparent 70%)`,
        opacity,
        pointerEvents: "none",
        filter: "blur(40px)",
      }}
    />
  );
}

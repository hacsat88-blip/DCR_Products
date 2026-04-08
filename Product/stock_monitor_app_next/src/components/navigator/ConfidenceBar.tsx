"use client";

import clsx from "clsx";

import { clampPercent, getConfidenceTone } from "./confidence";

interface ConfidenceBarProps {
  confidence: number;
  label?: string;
  delayMs?: number;
  compact?: boolean;
  className?: string;
}

export function ConfidenceBar({
  confidence,
  label = "CONF",
  delayMs = 0,
  compact = false,
  className,
}: ConfidenceBarProps): JSX.Element {
  const pct = clampPercent(confidence);
  const tone = getConfidenceTone(pct);

  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <span
        className={clsx(
          "font-mono tabular-nums uppercase tracking-wider text-text-muted",
          compact ? "w-11 text-[9px]" : "w-14 text-[10px]",
        )}
      >
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-sm border border-glass-border bg-canvas-deep/70">
        <div
          className={clsx("h-full animate-bar-fill", tone.barClass)}
          style={{ width: `${pct}%`, animationDelay: `${delayMs}ms` }}
        />
      </div>
      <span
        className={clsx(
          "w-11 text-right font-mono tabular-nums",
          compact ? "text-[10px]" : "text-xs",
          tone.textClass,
        )}
      >
        {pct}%
      </span>
    </div>
  );
}


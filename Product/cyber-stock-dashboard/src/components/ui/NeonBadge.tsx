import * as React from "react";
import { cn } from "@/lib/cn";

export type Signal = "go" | "fix" | "stop";

export interface NeonBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  signal: Signal;
  label?: string;
}

const signalMap: Record<Signal, { icon: string; text: string; cls: string }> = {
  go: {
    icon: "🟢",
    text: "GO",
    cls: "border-emerald-400/60 text-emerald-300 bg-emerald-400/10 shadow-[0_0_14px_rgba(16,185,129,0.45)]",
  },
  fix: {
    icon: "🟡",
    text: "FIX",
    cls: "border-amber-300/60 text-amber-200 bg-amber-300/10 shadow-[0_0_14px_rgba(251,191,36,0.45)]",
  },
  stop: {
    icon: "🔴",
    text: "STOP",
    cls: "border-alert/70 text-alert bg-alert/10 shadow-[0_0_14px_rgba(255,59,107,0.5)]",
  },
};

export function NeonBadge({
  signal,
  label,
  className,
  ...rest
}: NeonBadgeProps) {
  const meta = signalMap[signal];
  return (
    <span
      data-signal={signal}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold tracking-widest uppercase",
        meta.cls,
        className,
      )}
      {...rest}
    >
      <span aria-hidden="true">{meta.icon}</span>
      <span>{label ?? meta.text}</span>
    </span>
  );
}

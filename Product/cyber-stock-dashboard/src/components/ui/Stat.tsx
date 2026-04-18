import * as React from "react";
import { cn } from "@/lib/cn";

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  delta?: number;
  unit?: string;
  format?: (value: number) => string;
}

function defaultFormat(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function Stat({
  label,
  value,
  delta,
  unit,
  format,
  className,
  ...rest
}: StatProps) {
  const isPositive = typeof delta === "number" && delta > 0;
  const isNegative = typeof delta === "number" && delta < 0;
  const deltaCls = isPositive
    ? "text-emerald-300"
    : isNegative
      ? "text-alert"
      : "text-text/60";
  const arrow = isPositive ? "▲" : isNegative ? "▼" : "─";
  const fmt = format ?? defaultFormat;

  return (
    <div className={cn("flex flex-col gap-1", className)} {...rest}>
      <span className="heading-en text-[10px] text-text/60">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums text-text">
          {value}
          {unit ? (
            <span className="ml-0.5 text-xs text-text/60">{unit}</span>
          ) : null}
        </span>
        {typeof delta === "number" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs tabular-nums",
              deltaCls,
            )}
            data-delta-sign={isPositive ? "+" : isNegative ? "-" : "0"}
          >
            <span aria-hidden="true">{arrow}</span>
            <span>{fmt(delta)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

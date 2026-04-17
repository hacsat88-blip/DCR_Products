"use client";

import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import clsx from "clsx";

import { Sparkline } from "@/components/charts/Sparkline";

export interface SparklineTooltipProps {
  values: number[];
  change30dPct?: number;
  label?: string;
  children: React.ReactNode;
  className?: string;
}

export function SparklineTooltip({
  values,
  change30dPct,
  label,
  children,
  className,
}: SparklineTooltipProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);

  const positive = (change30dPct ?? 0) >= 0;
  const changeColor = positive ? "var(--inp-positive, #22C55E)" : "var(--inp-negative, #F97066)";

  return (
    <span
      className={clsx("inp-sparkline-tip relative inline-block", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
      data-testid="sparkline-tip-trigger"
    >
      {children}
      {open ? (
        <motion.span
          role="tooltip"
          aria-hidden={false}
          data-testid="sparkline-tip-content"
          className="inp-glass absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-md p-2"
          style={{ pointerEvents: "none", minWidth: 140 }}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.12 }}
        >
          {label ? (
            <div
              className="mb-1 text-[11px]"
              style={{ color: "var(--inp-text-secondary)" }}
            >
              {label}
            </div>
          ) : null}
          <Sparkline values={values} width={120} height={40} />
          {typeof change30dPct === "number" ? (
            <div
              className="mt-1 inline-block rounded px-1.5 py-0.5 text-[11px]"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: changeColor,
              }}
              data-testid="sparkline-tip-change"
            >
              {positive ? "+" : ""}
              {change30dPct.toFixed(2)}%
            </div>
          ) : null}
        </motion.span>
      ) : null}
    </span>
  );
}


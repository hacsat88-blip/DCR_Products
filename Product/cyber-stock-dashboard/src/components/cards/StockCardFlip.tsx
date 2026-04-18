"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { NeonBadge, NeonButton, NeonCard, Stat } from "@/components/ui";
import { RadarScore } from "./RadarScore";
import { Sparkline } from "./Sparkline";
import type { AuditData, CardFace, OperationData } from "./types";

export interface StockCardFlipProps {
  symbol: string;
  market: "JP" | "US";
  name: string;
  operation: OperationData;
  audit?: AuditData;
  defaultFace?: CardFace;
  onToggle?: (face: CardFace) => void;
  className?: string;
}

const FLIP_TRANSITION = {
  duration: 0.6,
  ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number],
};

const FACE_BASE =
  "absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden]";

function formatPrice(value: number, currency?: string): string {
  const n = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (currency === "JPY") return `¥${n}`;
  if (currency === "USD") return `$${n}`;
  return n;
}

function FaceContent({
  symbol,
  market,
  name,
  operation,
}: {
  symbol: string;
  market: "JP" | "US";
  name: string;
  operation: OperationData;
}) {
  const positive = operation.change >= 0;
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="heading-en text-[10px] text-text/60">
            {market} · {symbol}
          </p>
          <h3 className="text-lg font-semibold text-neon">{name}</h3>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tabular-nums text-text">
            {formatPrice(operation.price, operation.currency)}
          </div>
          <div
            className={cn(
              "text-xs tabular-nums",
              positive ? "text-emerald-300" : "text-alert",
            )}
          >
            {positive ? "▲" : "▼"} {operation.change.toFixed(2)} (
            {operation.changePercent.toFixed(2)}%)
          </div>
        </div>
      </div>
      <Sparkline data={operation.sparkline} height={60} />
      <div className="mt-auto grid grid-cols-3 gap-2">
        <Stat label="P&L" value={operation.pnl ?? 0} delta={operation.pnl} />
        <Stat
          label="QTY"
          value={(operation.holdingQty ?? 0).toLocaleString()}
        />
        <Stat
          label="UNRLZD"
          value={operation.unrealizedPnl ?? 0}
          delta={operation.unrealizedPnl}
        />
      </div>
    </div>
  );
}

function AuditContent({ audit }: { audit?: AuditData }) {
  if (!audit) {
    return (
      <div className="flex h-full items-center justify-center text-text/50">
        AUDIT DATA UNAVAILABLE
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="heading-en text-[10px] text-accent">AUDIT VIEW</p>
        <NeonBadge signal={audit.signal} />
      </div>
      <RadarScore scores={audit.scores} height={170} />
      <div className="grid grid-cols-3 gap-2 text-[11px] leading-snug">
        <div>
          <p className="heading-en text-[9px] text-text/50">SHORT</p>
          <p className="text-text/80">{audit.scenarios.short}</p>
        </div>
        <div>
          <p className="heading-en text-[9px] text-text/50">MID</p>
          <p className="text-text/80">{audit.scenarios.mid}</p>
        </div>
        <div>
          <p className="heading-en text-[9px] text-text/50">LONG</p>
          <p className="text-text/80">{audit.scenarios.long}</p>
        </div>
      </div>
      {audit.risks.length > 0 && (
        <div className="mt-auto">
          <p className="heading-en text-[9px] text-alert/80">RISKS</p>
          <ul className="list-disc pl-4 text-[11px] text-text/70">
            {audit.risks.slice(0, 3).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function StockCardFlip({
  symbol,
  market,
  name,
  operation,
  audit,
  defaultFace = "operation",
  onToggle,
  className,
}: StockCardFlipProps) {
  const [face, setFace] = React.useState<CardFace>(defaultFace);
  const reducedMotion = useReducedMotion();

  const toggle = React.useCallback(() => {
    setFace((prev) => {
      const next: CardFace = prev === "operation" ? "audit" : "operation";
      onToggle?.(next);
      return next;
    });
  }, [onToggle]);

  const isAudit = face === "audit";

  const auditCardCls =
    "h-full w-full !border-accent/60 shadow-[0_0_28px_rgba(184,107,255,0.55),inset_0_0_18px_rgba(184,107,255,0.22)]";

  return (
    <div
      className={cn("relative w-full max-w-[20rem] sm:w-80", className)}
      data-face={face}
    >
      <div className="relative h-96 w-full" style={{ perspective: 1200 }}>
        {reducedMotion ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={face}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
              data-testid="card-fade-face"
            >
              {isAudit ? (
                <NeonCard glow="strong" className={auditCardCls}>
                  <AuditContent audit={audit} />
                </NeonCard>
              ) : (
                <NeonCard glow="strong" className="h-full w-full">
                  <FaceContent
                    symbol={symbol}
                    market={market}
                    name={name}
                    operation={operation}
                  />
                </NeonCard>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.div
            className="relative h-full w-full"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateY: isAudit ? 180 : 0 }}
            transition={FLIP_TRANSITION}
            data-testid="card-flip-inner"
          >
            <div className={FACE_BASE} aria-hidden={isAudit}>
              <NeonCard glow="strong" className="h-full w-full">
                <FaceContent
                  symbol={symbol}
                  market={market}
                  name={name}
                  operation={operation}
                />
              </NeonCard>
            </div>
            <div
              className={FACE_BASE}
              style={{ transform: "rotateY(180deg)" }}
              aria-hidden={!isAudit}
            >
              <NeonCard glow="strong" className={auditCardCls}>
                <AuditContent audit={audit} />
              </NeonCard>
            </div>
          </motion.div>
        )}
      </div>

      <div className="mt-3 flex justify-end">
        <NeonButton
          variant={isAudit ? "ghost" : "primary"}
          size="sm"
          onClick={toggle}
          aria-pressed={isAudit}
          aria-label={
            isAudit
              ? `${symbol} を運用面に切替`
              : `${symbol} を監査面に切替`
          }
        >
          <span aria-hidden="true">⟳</span>
          <span>FLIP</span>
        </NeonButton>
      </div>
    </div>
  );
}

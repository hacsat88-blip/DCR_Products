"use client";

import { memo, useId } from "react";
import clsx from "clsx";

import { actionTone, formatActionLabel } from "@/lib/format";
import {
  getRemoveStockAriaLabel,
  formatStockChangeDisplay,
  formatStockPriceDisplay,
  getRemoveStockConfirmMessage,
  getStockDisplayName,
  getStockInsightText,
  isStockPricePending
} from "@/lib/stockPresentation";
import { Badge } from "@/components/ui/Badge";
import { SrcDot, SrcMetaDots } from "@/components/ui/SrcDot";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { HoldingInput } from "@/components/stock/HoldingInput";
import { useStockStore } from "@/store/useStockStore";
import { EvaluatedStock } from "@/types/stock";

interface StockCardProps {
  stock: EvaluatedStock;
  selected: boolean;
  onSelect: (stockId: string) => void;
  onToggleWatch: (stockId: string) => void;
  onRemove: (stockCode: string) => void;
}

function Sparkline({ data, className }: { data: Array<{ price: number }>; className?: string }): JSX.Element | null {
  const uid = useId().replace(/:/g, "");
  if (data.length < 2) return null;
  const prices = data.slice(-8).map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const pts = prices.map((p, i) => ({
    x: (i / (prices.length - 1)) * w,
    y: h - ((p - min) / range) * h,
  }));
  const trending = prices[prices.length - 1] >= prices[0];
  const color = trending ? "#22C55E" : "#EF4444";
  const gradId = `sg${uid}`;
  const filterId = `sf${uid}`;

  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp = (pts[i + 1].x - pts[i].x) / 2;
    d += ` C ${pts[i].x + cp},${pts[i].y} ${pts[i + 1].x - cp},${pts[i + 1].y} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  const areaD = `${d} L ${pts[pts.length - 1].x},${h} L ${pts[0].x},${h} Z`;

  return (
    <svg width={w} height={h} className={className} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
        <filter id={filterId}>
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${filterId})`}
      />
    </svg>
  );
}

const actionBarColor: Record<string, string> = {
  buy: "bg-positive/60",
  wait: "bg-secondary/50",
  exclude: "bg-danger/50"
};

function formatMetric(value: number | null): string {
  return value == null ? "--" : value.toFixed(1);
}

function formatYield(value: number | null): string {
  return value == null ? "--" : `${value.toFixed(1)}%`;
}

function StockCardInner({ stock, selected, onSelect, onToggleWatch, onRemove }: StockCardProps): JSX.Element {
  const tone = actionTone(stock.evaluatedAction);
  const pricePending = isStockPricePending(stock);
  const changePositive = !pricePending && stock.changePercent >= 0;
  const holdingsMap = useStockStore((s) => s.holdingsMap);
  const holding = holdingsMap[stock.id] ?? 0;
  const showHolding = stock.watched || holding > 0;
  const displayName = getStockDisplayName(stock);
  const insightText = getStockInsightText(stock);

  const handleRemove = (): void => {
    if (typeof window !== "undefined" && !window.confirm(getRemoveStockConfirmMessage(stock))) {
      return;
    }
    onRemove(stock.code);
  };

  return (
    <article
      className={clsx(
        "card-surface card-surface-hover group relative overflow-hidden p-4 transition-all duration-300",
        selected && "border-positive/50 shadow-elevated",
        !selected && tone === "buy" && "hover:border-positive/40",
        !selected && tone === "wait" && "hover:border-amber/40",
        !selected && tone === "exclude" && "hover:border-danger/40"
      )}
    >
      {/* Left accent bar */}
      <div className={clsx("absolute inset-y-0 left-0 w-[3px]", actionBarColor[tone] ?? "bg-secondary/50")} />

      <div className="flex items-start justify-between gap-3">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelect(stock.id)}>
          <div className="flex items-center gap-2">
            <span className="font-mono tabular-nums text-[11px] tracking-wider text-primary">{stock.code}</span>
            <Badge tone={tone} glow>
              {formatActionLabel(stock.evaluatedAction)}
            </Badge>
          </div>
          <SrcMetaDots
            priceLabel={stock.priceSourceLabel}
            fundamentalsLabel={stock.fundamentalsSourceLabel}
            className="mt-1"
          />
          <h3 className="mt-1.5 truncate text-base font-semibold tracking-heading text-text-primary transition-colors group-hover:text-white">
            {displayName}
          </h3>
        </button>
        <ScoreRing score={stock.score} size={52} strokeWidth={3.5} />
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <p className="font-mono tabular-nums text-2xl font-bold tracking-tight text-text-primary">
            {formatStockPriceDisplay(stock)}
          </p>
          <span
            className={clsx(
              "mt-1 inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold",
              pricePending
                ? "bg-border-subtle/40 text-text-muted"
                : changePositive
                  ? "bg-positive/10 text-positive"
                  : "bg-danger/10 text-danger"
            )}
          >
            {formatStockChangeDisplay(stock)}
          </span>
        </div>
        <Sparkline data={stock.chartData} className="opacity-50 transition-opacity group-hover:opacity-100" />
      </div>

      <p className="mt-2 text-[11px] tracking-wide text-text-muted">{stock.sector}</p>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-secondary">{insightText}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border-subtle bg-canvas-deep/50 p-2">
          <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">核心KPI</p>
          <p className="mt-0.5 font-mono tabular-nums text-sm font-semibold text-text-primary">{stock.coreKpiValue}</p>
        </div>
        <div className="rounded-lg border border-border-subtle bg-canvas-deep/50 p-2">
          <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">本命度</p>
          <p className="mt-0.5 font-mono tabular-nums text-sm font-semibold text-text-primary">{stock.score}</p>
        </div>
      </div>

      {showHolding && (
        <div className="mt-2">
          <HoldingInput stockId={stock.id} changePercent={stock.changePercent} compact />
        </div>
      )}

      <p className="mt-2 line-clamp-1 text-xs text-text-muted">{stock.riskSignal}</p>

      <div className="mt-3 rounded-lg border border-border-subtle bg-canvas-deep/35 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-muted">Valuation</p>
          <SrcDot label={stock.fundamentalsSourceLabel} scope="fundamentals" />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="rounded-md border border-border-subtle/70 bg-canvas-deep/60 px-2 py-1.5">
            <p className="text-[9px] font-medium uppercase tracking-widest text-text-muted">PER</p>
            <p className="mt-0.5 font-mono tabular-nums text-sm font-semibold text-text-primary">{formatMetric(stock.per)}</p>
          </div>
          <div className="rounded-md border border-border-subtle/70 bg-canvas-deep/60 px-2 py-1.5">
            <p className="text-[9px] font-medium uppercase tracking-widest text-text-muted">PBR</p>
            <p className="mt-0.5 font-mono tabular-nums text-sm font-semibold text-text-primary">{formatMetric(stock.pbr)}</p>
          </div>
          <div className="rounded-md border border-border-subtle/70 bg-canvas-deep/60 px-2 py-1.5">
            <p className="text-[9px] font-medium uppercase tracking-widest text-text-muted">DIV</p>
            <p className="mt-0.5 font-mono tabular-nums text-sm font-semibold text-text-primary">
              {formatYield(stock.dividendYield)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 border-t border-border-subtle pt-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => onToggleWatch(stock.id)}
          className={clsx(
            "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
            stock.watched
              ? "border-amber/30 bg-amber/8 text-amber hover:bg-amber/15"
              : "border-border-subtle text-text-secondary hover:border-border-active hover:text-text-primary"
          )}
        >
          {stock.watched ? "監視中" : "監視に追加"}
        </button>
        <button
          type="button"
          onClick={() => onSelect(stock.id)}
          className="rounded-lg border border-secondary/25 bg-secondary/8 px-3 py-2 text-xs font-semibold text-secondary transition-colors hover:bg-secondary/15"
        >
          詳細を見る
        </button>
        <button
          type="button"
          onClick={handleRemove}
          aria-label={getRemoveStockAriaLabel(stock)}
          className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/15"
        >
          削除
        </button>
      </div>
    </article>
  );
}

export const StockCard = memo(StockCardInner);

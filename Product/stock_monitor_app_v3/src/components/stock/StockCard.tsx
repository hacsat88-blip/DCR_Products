"use client";

import { memo, useId } from "react";
import clsx from "clsx";

import { actionTone, formatActionLabel, formatPercent, formatYen } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { HoldingInput } from "@/components/stock/HoldingInput";
import { useStockStore } from "@/store/useStockStore";
import { EvaluatedStock } from "@/types/stock";

interface StockCardProps {
  stock: EvaluatedStock;
  selected: boolean;
  onSelect: (stockId: string) => void;
  onToggleWatch: (stockId: string) => void;
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
  const color = trending ? "#5bf0ba" : "#ff8798";
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
  buy: "bg-mint/60",
  wait: "bg-blue/50",
  exclude: "bg-danger/50"
};

function StockCardInner({ stock, selected, onSelect, onToggleWatch }: StockCardProps): JSX.Element {
  const tone = actionTone(stock.evaluatedAction);
  const changePositive = stock.changePercent >= 0;
  const holdingsMap = useStockStore((s) => s.holdingsMap);
  const holding = holdingsMap[stock.id] ?? 0;
  const showHolding = stock.watched || holding > 0;

  return (
    <article
      className={clsx(
        "card-surface card-surface-hover group relative overflow-hidden p-4 transition-all duration-300",
        selected && "border-mint/50 shadow-glow-mint",
        !selected && tone === "buy" && "hover:border-mint/40",
        !selected && tone === "wait" && "hover:border-amber/40",
        !selected && tone === "exclude" && "hover:border-danger/40"
      )}
    >
      {/* Left accent bar */}
      <div className={clsx("absolute inset-y-0 left-0 w-[3px] rounded-l-2xl", actionBarColor[tone] ?? "bg-blue/50")} />

      <div className="flex items-start justify-between gap-3">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelect(stock.id)}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] tracking-wider text-text-muted">{stock.code}</span>
            <Badge tone={tone} glow>
              {formatActionLabel(stock.evaluatedAction)}
            </Badge>
          </div>
          <h3 className="mt-1.5 truncate text-base font-semibold tracking-heading text-text-primary transition-colors group-hover:text-white">
            {stock.name}
          </h3>
        </button>
        <ScoreRing score={stock.score} size={52} strokeWidth={3.5} />
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-bold tracking-tight text-text-primary">{formatYen(stock.price)}</p>
          <span
            className={clsx(
              "mt-1 inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold",
              changePositive ? "bg-mint/10 text-mint" : "bg-danger/10 text-danger"
            )}
          >
            {formatPercent(stock.changePercent)}
          </span>
        </div>
        <Sparkline data={stock.chartData} className="opacity-50 transition-opacity group-hover:opacity-100" />
      </div>

      <p className="mt-2 text-[11px] tracking-wide text-text-muted">{stock.sector}</p>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-secondary">{stock.oneLiner}</p>

      <div className={clsx("mt-3 grid gap-2", stock.per != null ? "grid-cols-3" : "grid-cols-2")}>
        <div className="rounded-lg border border-border-subtle bg-canvas-deep/50 p-2">
          <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">核心KPI</p>
          <p className="mt-0.5 text-sm font-semibold text-text-primary">{stock.coreKpiValue}</p>
        </div>
        <div className="rounded-lg border border-border-subtle bg-canvas-deep/50 p-2">
          <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">本命度</p>
          <p className="mt-0.5 text-sm font-semibold text-text-primary">{stock.score}</p>
        </div>
        {stock.per != null && (
          <div className="rounded-lg border border-border-subtle bg-canvas-deep/50 p-2">
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">PER</p>
            <p className="mt-0.5 text-sm font-semibold text-text-primary">{stock.per.toFixed(1)}</p>
          </div>
        )}
      </div>

      {showHolding && (
        <div className="mt-2">
          <HoldingInput stockId={stock.id} compact />
        </div>
      )}

      <p className="mt-2 line-clamp-1 text-xs text-text-muted">{stock.riskSignal}</p>

      <div className="mt-3 flex items-center gap-2 border-t border-border-subtle pt-3">
        <button
          type="button"
          onClick={() => onToggleWatch(stock.id)}
          className={clsx(
            "flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
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
          className="flex-1 rounded-lg border border-blue/25 bg-blue/8 px-3 py-2 text-xs font-semibold text-blue transition-colors hover:bg-blue/15"
        >
          詳細を見る
        </button>
      </div>
    </article>
  );
}

export const StockCard = memo(StockCardInner, (prev, next) => {
  return (
    prev.stock.id === next.stock.id &&
    prev.stock.price === next.stock.price &&
    prev.stock.score === next.stock.score &&
    prev.stock.evaluatedAction === next.stock.evaluatedAction &&
    prev.stock.watched === next.stock.watched &&
    prev.stock.changePercent === next.stock.changePercent &&
    prev.selected === next.selected
  );
});

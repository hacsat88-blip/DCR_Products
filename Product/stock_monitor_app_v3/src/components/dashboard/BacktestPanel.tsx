"use client";

import React, { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import {
  CHART_COLORS,
  CHART_GRID_PROPS,
  CHART_AXIS_TICK,
  CHART_TOOLTIP_STYLE,
  ACTIVE_DOT_PROPS
} from "@/components/ui/ChartTheme";
import { BacktestResult, BacktestRunParams } from "@/types/backtest";
import { EvaluatedStock } from "@/types/stock";

interface BacktestPanelProps {
  stocks: EvaluatedStock[];
  results: BacktestResult[];
  onRunBacktest: (params?: BacktestRunParams) => void;
  onClearResults: () => void;
}

function formatPct(value: number | null): string {
  if (value === null) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function BacktestTooltip({ active, payload, label }: any): JSX.Element | null {
  if (!active || !payload?.length) return null;
  const lines = payload.filter((e: any) => e.value != null && e.stroke && e.stroke !== "none");
  if (lines.length === 0) return null;
  return (
    <div style={CHART_TOOLTIP_STYLE} className="px-3 py-2.5">
      <p className="text-[11px] font-medium text-text-muted">{label}（指数）</p>
      <div className="mt-1.5 space-y-1">
        {lines.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.stroke }} />
            <span className="text-text-secondary">{entry.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-text-primary">
              {Number(entry.value).toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function BacktestLegend(): JSX.Element {
  const items = [
    { label: "戦略指数", color: CHART_COLORS.mint, dashed: false },
    { label: "ベンチマーク", color: CHART_COLORS.blue, dashed: true },
  ];
  return (
    <div className="flex items-center justify-center gap-6 pt-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span
            className="block h-[2px] w-5 rounded-full"
            style={{
              backgroundColor: item.dashed ? "transparent" : item.color,
              borderBottom: item.dashed ? `2px dashed ${item.color}` : undefined,
            }}
          />
          <span className="text-[11px] text-text-muted">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function BacktestPanelInner({
  stocks,
  results,
  onRunBacktest,
  onClearResults
}: BacktestPanelProps): JSX.Element {
  const [stockCode, setStockCode] = useState(stocks[0]?.code ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const canRunSingle = stockCode.trim().length > 0;

  useEffect(() => {
    if (!stockCode && stocks.length > 0) {
      setStockCode(stocks[0].code);
      return;
    }
    if (stockCode && !stocks.some((stock) => stock.code === stockCode)) {
      setStockCode(stocks[0]?.code ?? "");
    }
  }, [stockCode, stocks]);

  const current = useMemo(
    () => results.find((result) => result.stockCode === stockCode) ?? null,
    [results, stockCode]
  );

  const chartData = useMemo(
    () =>
      (current?.points ?? []).map((point) => ({
        date: point.date,
        strategy: point.strategyIndex ?? null,
        benchmark: point.benchmarkIndex ?? null
      })),
    [current]
  );

  return (
    <section className="rounded-none border border-glass-border bg-panel p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary font-orb">バックテスト</h2>
          <p className="text-xs text-slate-400">単銘柄優先の簡易バックテスト。説明可能性を重視しています。</p>
        </div>
        <button
          type="button"
          onClick={onClearResults}
          className="rounded-none border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200"
        >
          結果クリア
        </button>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <select
          value={stockCode}
          onChange={(event) => setStockCode(event.target.value)}
          className="rounded-none border border-slate-600 bg-slate-950/70 px-2 py-2 text-xs text-slate-100"
        >
          {stocks.map((stock) => (
            <option key={stock.code} value={stock.code}>
              {stock.code} {stock.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          className="rounded-none border border-slate-600 bg-slate-950/70 px-2 py-2 text-xs text-slate-100"
        />

        <input
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          className="rounded-none border border-slate-600 bg-slate-950/70 px-2 py-2 text-xs text-slate-100"
        />

        <button
          type="button"
          disabled={!canRunSingle}
          onClick={() =>
            onRunBacktest({
              mode: "single_stock",
              stockCode,
              startDate: startDate || undefined,
              endDate: endDate || undefined
            })
          }
          className="rounded-none border border-blue/40 bg-blue/10 px-3 py-2 text-xs font-semibold text-blue disabled:cursor-not-allowed disabled:opacity-50"
        >
          バックテスト実行
        </button>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-5">
        <div className="rounded-none border border-border-subtle bg-canvas-deep/50 p-3">
          <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted font-orb">戦略リターン</p>
          <p className={clsx("mt-1 text-base font-bold tabular-nums font-mono-tech", (current?.totalReturnPct ?? 0) >= 0 ? "text-mint" : "text-danger")}>
            {formatPct(current?.totalReturnPct ?? null)}
          </p>
        </div>
        <div className="rounded-none border border-border-subtle bg-canvas-deep/50 p-3">
          <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted font-orb">ベンチマークリターン</p>
          <p className={clsx("mt-1 text-base font-bold tabular-nums font-mono-tech", (current?.benchmarkReturnPct ?? 0) >= 0 ? "text-mint" : "text-danger")}>
            {formatPct(current?.benchmarkReturnPct ?? null)}
          </p>
        </div>
        <div className="rounded-none border border-border-subtle bg-canvas-deep/50 p-3">
          <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted font-orb">超過リターン</p>
          <p className={clsx("mt-1 text-base font-bold tabular-nums font-mono-tech", (current?.excessReturnPct ?? 0) >= 0 ? "text-mint" : "text-danger")}>
            {formatPct(current?.excessReturnPct ?? null)}
          </p>
        </div>
        <div className="rounded-none border border-border-subtle bg-canvas-deep/50 p-3">
          <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted font-orb">最大ドローダウン</p>
          <p className="mt-1 text-base font-bold tabular-nums text-danger font-mono-tech">
            {formatPct(current?.maxDrawdownPct ?? null)}
          </p>
        </div>
        <div className="rounded-none border border-border-subtle bg-canvas-deep/50 p-3">
          <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted font-orb">判定切替回数</p>
          <p className="mt-1 text-base font-bold tabular-nums text-text-primary font-mono-tech">{current?.actionChanges ?? 0}</p>
        </div>
      </div>

      {current === null ? (
        <p className="mt-2 text-xs text-amber">この銘柄のバックテストは未実行です。</p>
      ) : null}

      <div className="mt-4 h-[280px] md:h-[340px]">
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="gradientStrategy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.mint} stopOpacity={0.2} />
                <stop offset="100%" stopColor={CHART_COLORS.mint} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis dataKey="date" stroke="transparent" tick={CHART_AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis stroke="transparent" tick={CHART_AXIS_TICK} tickLine={false} axisLine={false} width={42} />
            <Tooltip content={<BacktestTooltip />} cursor={{ stroke: CHART_COLORS.axis, strokeDasharray: "3 3" }} />
            <Area type="monotone" dataKey="strategy" fill="url(#gradientStrategy)" stroke="none" />
            <Line type="monotone" dataKey="strategy" name="戦略指数" stroke={CHART_COLORS.mint} strokeWidth={2} dot={false} activeDot={{ ...ACTIVE_DOT_PROPS, stroke: CHART_COLORS.mint }} />
            <Line type="monotone" dataKey="benchmark" name="ベンチマーク" stroke={CHART_COLORS.blue} strokeWidth={2} strokeDasharray="6 3" dot={false} activeDot={{ ...ACTIVE_DOT_PROPS, stroke: CHART_COLORS.blue }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <BacktestLegend />

      <p className="mt-3 text-xs text-amber">
        これは簡易検証であり、投資成果を保証するものではありません。
      </p>
    </section>
  );
}

export const BacktestPanel = React.memo(BacktestPanelInner);

"use client";

import { memo } from "react";
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
import { EvaluatedStock } from "@/types/stock";

interface BenchmarkChartProps {
  stocks: EvaluatedStock[];
}

interface ChartRow {
  date: string;
  manager: number | null;
  benchmark: number | null;
}

function buildBenchmarkSeries(stocks: EvaluatedStock[]): ChartRow[] {
  if (stocks.length === 0) {
    return [];
  }

  const stockPointMaps = stocks.map((stock) => {
    const pointMap = new Map(stock.chartData.map((point) => [point.date, point] as const));
    const dateSet = new Set(stock.chartData.map((point) => point.date));
    const firstPrice = stock.chartData.find((point) => Number.isFinite(point.price))?.price ?? null;
    return { pointMap, dateSet, firstPrice };
  });

  let commonDates = [...stockPointMaps[0].dateSet];
  for (const stockMap of stockPointMaps.slice(1)) {
    commonDates = commonDates.filter((date) => stockMap.dateSet.has(date));
  }

  const stableDates = commonDates
    .filter((date) =>
      stockPointMaps.every((stockMap) => {
        const point = stockMap.pointMap.get(date);
        return Boolean(
          point &&
            stockMap.firstPrice !== null &&
            stockMap.firstPrice !== 0 &&
            Number.isFinite(point.price) &&
            Number.isFinite(point.benchmark)
        );
      })
    )
    .sort((a, b) => Date.parse(a) - Date.parse(b));

  return stableDates.map((date) => {
    let managerTotal = 0;
    let benchmarkTotal = 0;
    for (const stockMap of stockPointMaps) {
      const point = stockMap.pointMap.get(date)!;
      const firstPrice = stockMap.firstPrice!;
      managerTotal += (point.price / firstPrice) * 100;
      benchmarkTotal += point.benchmark;
    }

    return {
      date,
      manager: managerTotal / stockPointMaps.length,
      benchmark: benchmarkTotal / stockPointMaps.length
    };
  });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function BenchmarkTooltip({ active, payload, label }: any): JSX.Element | null {
  if (!active || !payload?.length) return null;
  const lines = payload.filter((e: any) => e.stroke && e.stroke !== "none");
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
              {Number(entry.value).toFixed(1)} pt
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function BenchmarkLegend(): JSX.Element {
  const items = [
    { label: "戦略指数", color: CHART_COLORS.mint },
    { label: "ベンチマーク指数", color: CHART_COLORS.blue },
  ];
  return (
    <div className="flex items-center justify-center gap-6 pt-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="block h-[2px] w-5 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-[11px] text-text-muted">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export const BenchmarkChart = memo(function BenchmarkChart({ stocks }: BenchmarkChartProps): JSX.Element {
  const data = buildBenchmarkSeries(stocks);

  return (
    <section className="rounded-none border border-glass-border bg-panel p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text-primary font-orb">ベンチマーク比較チャート</h2>
        <p className="rounded-none border border-slate-600/40 px-3 py-1 text-xs text-text-muted">指数表示（初期日=100）</p>
      </div>
      <p className="mb-3 text-xs text-text-muted">
        戦略指数は表示銘柄の平均を初期日=100で指数化した値です。ベンチマークも同じ基準で表示しています。
      </p>
      <div className="h-[320px] w-full md:h-[420px]">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 18, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="gradientManager" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.mint} stopOpacity={0.2} />
                <stop offset="100%" stopColor={CHART_COLORS.mint} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradientBenchmark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.blue} stopOpacity={0.15} />
                <stop offset="100%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis dataKey="date" stroke="transparent" tick={CHART_AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis stroke="transparent" tick={CHART_AXIS_TICK} tickLine={false} axisLine={false} width={48} tickFormatter={(value: number) => `${value.toFixed(0)}`} />
            <Tooltip content={<BenchmarkTooltip />} cursor={{ stroke: CHART_COLORS.axis, strokeDasharray: "3 3" }} />
            <Area type="monotone" dataKey="manager" fill="url(#gradientManager)" stroke="none" />
            <Area type="monotone" dataKey="benchmark" fill="url(#gradientBenchmark)" stroke="none" />
            <Line type="monotone" dataKey="manager" name="戦略指数" stroke={CHART_COLORS.mint} strokeWidth={2} dot={false} activeDot={{ ...ACTIVE_DOT_PROPS, stroke: CHART_COLORS.mint }} animationDuration={800} animationEasing="ease-out" />
            <Line type="monotone" dataKey="benchmark" name="ベンチマーク指数" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} activeDot={{ ...ACTIVE_DOT_PROPS, stroke: CHART_COLORS.blue }} animationDuration={800} animationEasing="ease-out" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <BenchmarkLegend />
    </section>
  );
});

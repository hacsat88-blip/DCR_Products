"use client";

import React, { Suspense, useState } from "react";
import clsx from "clsx";

import { NikkeiCandlestickChart } from "@/components/dashboard/NikkeiCandlestickChart";
import { NikkeiTrendChart } from "@/components/dashboard/NikkeiTrendChart";
import { SkeletonCard } from "@/components/ui/Skeleton";

interface NikkeiChartPanelProps {
  lastUpdatedAt: string | null;
}

type ChartType = "candlestick" | "trend";

const CHART_TYPE_OPTIONS: { label: string; value: ChartType; icon: string }[] = [
  { label: "ローソク足", value: "candlestick", icon: "📊" },
  { label: "折れ線グラフ", value: "trend", icon: "📈" },
];

export function NikkeiChartPanel({ lastUpdatedAt }: NikkeiChartPanelProps): JSX.Element {
  const [chartType, setChartType] = useState<ChartType>("candlestick");

  return (
    <section className="card-surface card-surface-hover p-5">
      {/* Header with chart type selector */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text-primary">
          日経225 チャート
        </h2>
        
        {/* Dropdown selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="chart-type-select" className="text-xs font-medium text-text-muted uppercase tracking-wider">
            表示
          </label>
          <select
            id="chart-type-select"
            value={chartType}
            onChange={(e) => setChartType(e.target.value as ChartType)}
            className={clsx(
              "rounded-lg px-3 py-2 text-sm font-medium transition-all",
              "border border-border-subtle bg-canvas-raised text-text-primary",
              "hover:border-border-emphasis focus:outline-none focus:ring-2 focus:ring-positive/30",
              "cursor-pointer"
            )}
          >
            {CHART_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.icon} {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart content */}
      <div className="relative">
        {chartType === "candlestick" ? (
          <NikkeiCandlestickChart lastUpdatedAt={lastUpdatedAt} />
        ) : (
          <Suspense fallback={<SkeletonCard />}>
            <NikkeiTrendChart lastUpdatedAt={lastUpdatedAt} />
          </Suspense>
        )}
      </div>
    </section>
  );
}

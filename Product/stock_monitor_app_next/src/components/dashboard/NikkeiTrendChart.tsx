"use client";

import React, { useState } from"react";
import {
 Area,
 AreaChart,
 CartesianGrid,
 ResponsiveContainer,
 Tooltip,
 XAxis,
 YAxis,
} from"recharts";

import {
  CHART_COLORS,
  CHART_SERIES,
  CHART_GRID_PROPS,
  CHART_AXIS_TICK,
  CHART_TOOLTIP_STYLE,
  ACTIVE_DOT_PROPS,
} from"@/components/ui/ChartTheme";
import { useNikkei } from"@/hooks/useNikkei";

interface NikkeiTrendChartProps {
 lastUpdatedAt: string | null;
}

type Range ="5d" |"1mo" |"3mo" |"6mo" |"1y";

const RANGE_OPTIONS: { label: string; value: Range }[] = [
 { label:"1W", value:"5d" },
 { label:"1M", value:"1mo" },
 { label:"3M", value:"3mo" },
 { label:"6M", value:"6mo" },
 { label:"1Y", value:"1y" },
];

function formatYen(value: number): string {
 return `¥${value.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}`;
}

function formatDateTick(dateStr: string): string {
 const d = new Date(dateStr);
 return `${d.getMonth() + 1}/${d.getDate()}`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function NikkeiTooltip({ active, payload, label }: any): JSX.Element | null {
 if (!active || !payload?.length) return null;
 const entry = payload[0];
 if (entry == null || !Number.isFinite(entry.value)) return null;
 return (
 <div style={CHART_TOOLTIP_STYLE} className="px-3 py-2.5">
 <p className="text-[11px] font-medium text-text-muted">{label}</p>
 <div className="mt-1.5 flex items-center gap-2 text-sm">
 <span
 className="h-2 w-2 rounded-full"
  style={{ backgroundColor: CHART_SERIES.nikkei }}
 />
 <span className="text-text-secondary">終値</span>
 <span className="ml-auto font-semibold tabular-nums text-text-primary">
 {formatYen(entry.value as number)}
 </span>
 </div>
 </div>
 );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function NikkeiTrendChartInner({
 lastUpdatedAt,
}: NikkeiTrendChartProps): JSX.Element {
 const [range, setRange] = useState<Range>("1mo");
 const { latestClose, diff, diffPercent, sourceLabel, history } = useNikkei(
 lastUpdatedAt,
 range,
 );

 const isLoading = history.length === 0 && latestClose === null;
 const hasChart = history.length > 0;

 const diffSign =
 diff !== null && diff > 0 ?"+" : diff !== null && diff < 0 ?"" :"";
 const diffColor =
 diff !== null && diff >= 0 ?"text-positive" :"text-danger";

 return (
 <section className="card-surface card-surface-hover p-5">
 {/* Header */}
 <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
 <div>
 <h2 className="text-lg font-semibold text-text-primary">日経225</h2>
 {sourceLabel && (
 <p className="mt-0.5 text-xs text-text-muted">{sourceLabel}</p>
 )}
 </div>

 {/* Range selector */}
 <div className="flex items-center gap-1.5">
 {RANGE_OPTIONS.map((opt) => (
 <button
 key={opt.value}
 type="button"
 onClick={() => setRange(opt.value)}
 className={`rounded-lg px-3 py-1 text-[11px] font-medium transition-colors ${
 range === opt.value
 ?"border border-amber/30 bg-amber/15 text-amber"
 :"border border-transparent text-text-muted hover:text-text-secondary"
 }`}
 >
 {opt.label}
 </button>
 ))}
 </div>
 </div>

 {/* Price display */}
 {latestClose !== null && (
 <div className="mb-4 flex flex-wrap items-baseline gap-3">
 <span className="text-3xl font-bold tabular-nums text-text-primary font-mono md:text-4xl">
 {formatYen(latestClose)}
 </span>
 {diff !== null && diffPercent !== null && (
 <span
 className={`rounded-lg bg-canvas-raised/60 px-2 py-0.5 text-sm font-medium tabular-nums font-mono ${diffColor}`}
 >
 {diffSign}
 {diff.toLocaleString("ja-JP", { maximumFractionDigits: 0 })} (
 {diffSign}
 {diffPercent.toFixed(2)}%)
 </span>
 )}
 </div>
 )}

 {/* Loading skeleton */}
 {isLoading && (
 <div className="h-[280px] animate-pulse rounded-lg bg-canvas-raised/40 md:h-[360px]" />
 )}

 {/* Chart */}
 {hasChart && (
 <div className="h-[280px] w-full md:h-[360px]">
 <ResponsiveContainer>
 <AreaChart
 data={history}
 margin={{ top: 8, right: 18, left: 0, bottom: 8 }}
 >
 <defs>
 <linearGradient
 id="nikkeiGradient"
 x1="0"
 y1="0"
 x2="0"
 y2="1"
 >
 <stop
 offset="0%"
  stopColor={CHART_SERIES.nikkei}
 stopOpacity={0.3}
 />
 <stop
 offset="100%"
  stopColor={CHART_SERIES.nikkei}
 stopOpacity={0}
 />
 </linearGradient>
 </defs>
 <CartesianGrid {...CHART_GRID_PROPS} />
 <XAxis
 dataKey="date"
 stroke="transparent"
 tick={CHART_AXIS_TICK}
 tickLine={false}
 axisLine={false}
 tickFormatter={formatDateTick}
 />
 <YAxis
 stroke="transparent"
 tick={CHART_AXIS_TICK}
 tickLine={false}
 axisLine={false}
 width={65}
 tickFormatter={(v: number) => formatYen(v)}
 />
 <Tooltip
 content={<NikkeiTooltip />}
 cursor={{
 stroke: CHART_COLORS.axis,
 strokeDasharray:"3 3",
 }}
 />
 <Area
 type="monotone"
 dataKey="close"
  stroke={CHART_SERIES.nikkei}
 strokeWidth={2}
 fill="url(#nikkeiGradient)"
 dot={false}
 activeDot={{
 ...ACTIVE_DOT_PROPS,
  stroke: CHART_SERIES.nikkei,
 }}
 animationDuration={800}
 animationEasing="ease-out"
 />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 )}
 </section>
 );
}

export const NikkeiTrendChart = React.memo(NikkeiTrendChartInner);

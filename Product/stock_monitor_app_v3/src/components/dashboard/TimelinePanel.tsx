import React, { useMemo } from"react";
import {
 Area,
 CartesianGrid,
 Line,
 LineChart,
 ReferenceLine,
 ResponsiveContainer,
 Tooltip,
 XAxis,
 YAxis
} from"recharts";

import { formatActionLabel } from"@/lib/format";
import {
 CHART_COLORS,
 CHART_GRID_PROPS,
 CHART_AXIS_TICK,
 CHART_TOOLTIP_STYLE,
 ACTIVE_DOT_PROPS
} from"@/components/ui/ChartTheme";
import { StockSnapshot } from"@/types/archive";
import { EvaluatedStock } from"@/types/stock";

interface TimelinePanelProps {
 stock: EvaluatedStock | null;
 snapshots: StockSnapshot[];
}

function formatDateTime(value: string): string {
 const parsed = new Date(value);
 if (Number.isNaN(parsed.getTime())) {
 return value;
 }
 return parsed.toLocaleString("ja-JP");
}

function actionLabel(value: string | null | undefined): string {
 if (value ==="buy_now" || value ==="wait_earnings" || value ==="wait_pullback" || value ==="exclude") {
 return formatActionLabel(value);
 }
 return"-";
}

function formatJpDate(value: string): string {
 const d = new Date(value);
 if (Number.isNaN(d.getTime())) return String(value).slice(5, 10);
 return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function TimelineTooltip({ active, payload, label }: any): JSX.Element | null {
 if (!active || !payload?.length) return null;
 return (
 <div style={CHART_TOOLTIP_STYLE} className="px-3 py-2.5">
 <p className="text-[11px] font-medium text-text-muted">{formatDateTime(String(label))}</p>
 <div className="mt-1.5 space-y-1">
 {payload.filter((e: any) => e.value != null && e.stroke && e.stroke !=="none").map((entry: any) => (
 <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
 <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.stroke }} />
 <span className="text-text-secondary">{entry.name}</span>
 <span className="ml-auto font-semibold font-mono tabular-nums text-text-primary">
 {entry.dataKey ==="price" ? `¥${Number(entry.value).toLocaleString()}` : `${Number(entry.value).toFixed(0)} pt`}
 </span>
 </div>
 ))}
 </div>
 </div>
 );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function TimelinePanelInner({ stock, snapshots }: TimelinePanelProps): JSX.Element {
 const timeline = useMemo(
 () =>
 stock
 ? snapshots
 .filter((snapshot) => snapshot.code === stock.code)
 .sort((a, b) => Date.parse(a.checkedAt) - Date.parse(b.checkedAt))
 : [],
 [snapshots, stock]
 );

 if (!stock) {
 return (
 <section className="rounded-lg border border-glass-border bg-panel p-5 shadow-card">
 <h2 className="text-lg font-semibold text-text-primary">評価タイムライン</h2>
 <p className="mt-2 text-sm text-text-secondary">銘柄を選択すると履歴を表示します。</p>
 </section>
 );
 }

 if (timeline.length === 0) {
 return (
 <section className="rounded-lg border border-glass-border bg-panel p-5 shadow-card">
 <h2 className="text-lg font-semibold text-text-primary">評価タイムライン</h2>
 <p className="mt-2 text-sm text-text-secondary">まだ履歴がありません。</p>
 </section>
 );
 }

 const chartData = timeline.map((item) => ({
 checkedAt: item.checkedAt,
 score: item.score,
 price: item.price,
 action: item.evaluatedAction,
 dataMode: item.dataMode
 }));

 const actionChanges = chartData.reduce<Array<{ checkedAt: string; action: string }>>((acc, point, i) => {
 if (i > 0 && point.action && point.action !== chartData[i - 1].action) {
 acc.push({ checkedAt: point.checkedAt, action: String(point.action) });
 }
 return acc;
 }, []);

 const recent = [...timeline].reverse().slice(0, 8);

 return (
 <section className="rounded-lg border border-glass-border bg-panel p-5 shadow-card">
 <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
 <h2 className="text-lg font-semibold text-text-primary">評価タイムライン</h2>
 <p className="text-xs text-text-muted">
 {stock.code} {stock.name}
 </p>
 </div>

 <div className="h-[260px] md:h-[320px]">
 <ResponsiveContainer>
 <LineChart data={chartData} margin={{ top: 8, right: 18, left: 0, bottom: 8 }}>
 <defs>
 <linearGradient id="gradientScore" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor={CHART_COLORS.mint} stopOpacity={0.2} />
 <stop offset="100%" stopColor={CHART_COLORS.mint} stopOpacity={0} />
 </linearGradient>
 </defs>
 <CartesianGrid {...CHART_GRID_PROPS} />
 <XAxis dataKey="checkedAt" tickFormatter={formatJpDate} stroke="transparent" tick={CHART_AXIS_TICK} tickLine={false} axisLine={false} />
 <YAxis yAxisId="score" stroke="transparent" tick={{ ...CHART_AXIS_TICK, fill: CHART_COLORS.mint }} tickLine={false} axisLine={false} width={36} domain={[0, 100]} />
 <YAxis yAxisId="price" orientation="right" stroke="transparent" tick={{ ...CHART_AXIS_TICK, fill: CHART_COLORS.blue }} tickLine={false} axisLine={false} width={50} tickFormatter={(v: number) => `¥${(v / 1000).toFixed(0)}k`} />
 <Tooltip content={<TimelineTooltip />} cursor={{ stroke: CHART_COLORS.axis, strokeDasharray:"3 3" }} />
 {actionChanges.map((change) => (
 <ReferenceLine
 key={change.checkedAt}
 x={change.checkedAt}
 yAxisId="score"
 stroke={CHART_COLORS.amber}
 strokeDasharray="4 4"
 strokeWidth={1}
 label={{ value: actionLabel(change.action), position:"insideTopRight", fontSize: 9, fill: CHART_COLORS.amber }}
 />
 ))}
 <Area yAxisId="score" type="monotone" dataKey="score" fill="url(#gradientScore)" stroke="none" />
 <Line yAxisId="score" type="monotone" dataKey="score" name="本命度" stroke={CHART_COLORS.mint} strokeWidth={2} dot={false} activeDot={{ ...ACTIVE_DOT_PROPS, stroke: CHART_COLORS.mint }} />
 <Line yAxisId="price" type="monotone" dataKey="price" name="株価" stroke={CHART_COLORS.blue} strokeWidth={2} dot={{ r: 2, fill: CHART_COLORS.blue, strokeWidth: 0 }} activeDot={{ ...ACTIVE_DOT_PROPS, stroke: CHART_COLORS.blue }} />
 </LineChart>
 </ResponsiveContainer>
 </div>

 <div className="mt-3 grid gap-2">
 {recent.map((item, index) => {
 const next = recent[index + 1];
 const scoreDelta =
 next && item.score !== null && next.score !== null ? item.score - next.score : null;
 const actionChanged =
 next && item.evaluatedAction && next.evaluatedAction
 ? item.evaluatedAction !== next.evaluatedAction
 : false;
 return (
 <article key={item.id} className="rounded-lg border border-border-subtle bg-canvas-deep/50 p-3 text-xs text-text-primary">
 <p className="font-semibold font-mono tabular-nums">{formatDateTime(item.checkedAt)}</p>
 <p className="mt-1 font-mono tabular-nums">
 score {item.score ??"-"} / action {actionLabel(item.evaluatedAction)} / price{""}
 {item.price ??"-"}
 </p>
 <p className="mt-1 text-text-muted">
 データモード: {item.dataMode ??"-"} / データ健全性: {item.providerHealth ??"-"}
 </p>
 <p className="mt-1 text-text-muted">
 本命度差分: {scoreDelta === null ?"-" : `${scoreDelta > 0 ?"+" :""}${scoreDelta}`} / 判定変化:{""}
 {actionChanged ?"あり" :"なし"}
 </p>
 </article>
 );
 })}
 </div>
 </section>
 );
}

export const TimelinePanel = React.memo(TimelinePanelInner);

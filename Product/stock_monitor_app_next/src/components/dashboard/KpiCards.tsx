import React, { useMemo } from"react";

import clsx from"clsx";
import {
 ResponsiveContainer,
 AreaChart,
 Area,
 BarChart,
 Bar,
 PieChart,
 Pie,
 Cell
} from"recharts";

import { EvaluatedStock, StockAction } from"@/types/stock";
import { ACTION_CHART_COLORS, CHART_COLORS, CHART_SERIES } from"@/components/ui/ChartTheme";
import { AnimatedNumber, motion, staggerContainerVariants, staggerItemVariants } from"@/components/ui/MotionPrimitives";

interface KpiCardsProps {
 managerIndex: number;
 benchmarkIndex: number;
 excessReturn: number;
 totalCount: number;
 watchCount: number;
 holdingsCount: number;
 stocks: EvaluatedStock[];
 managerSeries: number[];
 benchmarkSeries: number[];
 nikkei?: {
 latestClose: number | null;
 diff: number | null;
 diffPercent: number | null;
 sourceLabel?: string | null;
 history?: { date: string; close: number }[];
 } | null;
}

const SPARKLINE_POINTS = 12;

function tail<T>(arr: T[], n: number): T[] {
 return arr.length <= n ? arr : arr.slice(arr.length - n);
}

function toSparkData(series: number[]): { v: number }[] {
 return tail(series, SPARKLINE_POINTS).map((v) => ({ v }));
}

function trendChange(series: number[]): number | null {
 if (series.length < 2) return null;
 return series[series.length - 1] - series[series.length - 2];
}

function TrendArrow({ value }: { value: number | null }): JSX.Element | null {
 if (value === null || !Number.isFinite(value) || value === 0) return null;
 return (
 <svg
 className={clsx("inline-block h-3.5 w-3.5", value > 0 ?"text-positive" :"text-danger")}
 viewBox="0 0 16 16"
 fill="currentColor"
 >
 {value > 0 ? <path d="M8 3l5 6H3z" /> : <path d="M8 13l5-6H3z" />}
 </svg>
 );
}

/* ─── Sparkline area chart ─── */
function Sparkline({
 data,
 color,
 gradientId
}: {
 data: { v: number }[];
 color: string;
 gradientId: string;
}): JSX.Element | null {
 if (data.length < 2) return null;
 return (
 <div className="mt-2 -mx-5 -mb-5">
 <ResponsiveContainer width="100%" height={36}>
 <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
 <defs>
 <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor={color} stopOpacity={0.3} />
 <stop offset="100%" stopColor={color} stopOpacity={0.02} />
 </linearGradient>
 </defs>
 <Area
 type="monotone"
 dataKey="v"
 stroke={color}
 strokeWidth={1.5}
 fill={`url(#${gradientId})`}
 isAnimationActive={false}
 />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 );
}

/* ─── Excess return mini bar chart ─── */
function ExcessBars({
 managerSeries,
 benchmarkSeries
}: {
 managerSeries: number[];
 benchmarkSeries: number[];
}): JSX.Element | null {
 const data = useMemo(() => {
 const mTail = tail(managerSeries, SPARKLINE_POINTS);
 const bTail = tail(benchmarkSeries, SPARKLINE_POINTS);
 const len = Math.min(mTail.length, bTail.length);
 if (len < 2) return [];
 return Array.from({ length: len }, (_, i) => ({
 d: +(mTail[i] - bTail[i]).toFixed(2)
 }));
 }, [managerSeries, benchmarkSeries]);

 if (data.length < 2) return null;
 return (
 <div className="mt-2 -mx-5 -mb-5">
 <ResponsiveContainer width="100%" height={36}>
 <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
 <Bar dataKey="d" isAnimationActive={false} radius={[1, 1, 0, 0]}>
 {data.map((entry, i) => (
  <Cell
  key={i}
  fill={entry.d >= 0 ? CHART_SERIES.positive : CHART_SERIES.negative}
  fillOpacity={0.62}
  />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>
 );
}

/* ─── Action distribution donut ─── */
const ACTION_COLORS: Record<string, string> = {
 buy: ACTION_CHART_COLORS.buy,
 wait: CHART_COLORS.amber,
 exclude: ACTION_CHART_COLORS.exclude
};

function ActionDonut({ stocks }: { stocks: EvaluatedStock[] }): JSX.Element | null {
 const data = useMemo(() => {
 const counts: Record<string, number> = { buy: 0, wait: 0, exclude: 0 };
 for (const s of stocks) {
 const a: StockAction = s.evaluatedAction;
 if (a ==="buy_now") counts.buy++;
 else if (a ==="exclude") counts.exclude++;
 else counts.wait++;
 }
 return Object.entries(counts)
 .filter(([, v]) => v > 0)
 .map(([name, value]) => ({ name, value }));
 }, [stocks]);

 if (data.length === 0) return null;
 return (
 <div className="absolute right-3 top-1/2 -translate-y-1/2">
 <ResponsiveContainer width={48} height={48}>
 <PieChart>
 <Pie
 data={data}
 cx="50%"
 cy="50%"
 innerRadius={14}
 outerRadius={22}
 paddingAngle={2}
 dataKey="value"
 stroke="none"
 isAnimationActive={false}
 >
 {data.map((entry) => (
  <Cell key={entry.name} fill={ACTION_COLORS[entry.name] ?? CHART_COLORS.violet} />
 ))}
 </Pie>
 </PieChart>
 </ResponsiveContainer>
 </div>
 );
}

/* ─── Format helpers ─── */
function formatSigned(value: number | null, digits: number, suffix: string): string {
 if (value === null || !Number.isFinite(value)) return"-";
 const sign = value > 0 ?"+" : value < 0 ?"-" :"\u00B1";
 return `${sign}${Math.abs(value).toFixed(digits)}${suffix}`;
}

/* ─── Main export ─── */
function KpiCardsInner({
 managerIndex,
 benchmarkIndex,
 excessReturn,
 totalCount,
 watchCount,
 holdingsCount,
 stocks,
 managerSeries,
 benchmarkSeries,
 nikkei
}: KpiCardsProps): JSX.Element {
 const diff = nikkei?.diff ?? null;
 const diffPercent = nikkei?.diffPercent ?? null;
 const excessTone = excessReturn >= 0 ?"positive" :"negative";

 const managerChange = trendChange(managerSeries);
 const benchmarkChange = trendChange(benchmarkSeries);

 const managerSparkData = useMemo(() => toSparkData(managerSeries), [managerSeries]);
 const benchmarkSparkData = useMemo(() => toSparkData(benchmarkSeries), [benchmarkSeries]);
 const nikkeiSparkData = useMemo(
 () => (nikkei?.history ?? []).map((p) => ({ v: p.close })),
 [nikkei?.history]
 );

 return (
 <motion.section
 className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5"
 variants={staggerContainerVariants}
 initial="hidden"
 animate="visible"
 >
 {/* Card 1: Strategy Index */}
 <motion.div variants={staggerItemVariants} className="card-surface group relative overflow-hidden p-5 transition-all duration-300 hover:shadow-elevated">
 <div className="absolute inset-y-0 left-0 w-[2px] bg-positive/50" />
 <p className="text-[10px] uppercase tracking-widest text-text-muted">戦略指数</p>
 <div className="mt-1.5 flex items-baseline gap-2">
 <p className="font-mono tabular-nums text-3xl md:text-4xl font-semibold tracking-kpi text-text-primary">
 <AnimatedNumber value={managerIndex} duration={0.8} formatFn={(n) => n.toFixed(1)} />
 <span className="ml-1 text-sm font-normal text-text-muted">pt</span>
 </p>
 {managerChange !== null && (
 <span className="flex items-center gap-0.5 text-xs">
 <TrendArrow value={managerChange} />
 <span className={clsx(managerChange > 0 ?"text-positive" : managerChange < 0 ?"text-danger" :"text-text-muted")}>
 {formatSigned(managerChange, 1,"")}
 </span>
 </span>
 )}
 </div>
 <p className="mt-1 text-xs text-text-muted">初期日=100</p>
  <Sparkline data={managerSparkData} color={CHART_SERIES.strategy} gradientId="spark-manager" />
 </motion.div>

 {/* Card 2: Benchmark */}
 <motion.div variants={staggerItemVariants} className="card-surface group relative overflow-hidden p-5 transition-all duration-300 hover:shadow-elevated">
 <div className="absolute inset-y-0 left-0 w-[2px] bg-secondary/50" />
 <p className="text-[10px] uppercase tracking-widest text-text-muted">ベンチマーク指数</p>
 <div className="mt-1.5 flex items-baseline gap-2">
 <p className="font-mono tabular-nums text-3xl md:text-4xl font-semibold tracking-kpi text-text-primary">
 <AnimatedNumber value={benchmarkIndex} duration={0.8} formatFn={(n) => n.toFixed(1)} />
 <span className="ml-1 text-sm font-normal text-text-muted">pt</span>
 </p>
 {benchmarkChange !== null && (
 <span className="flex items-center gap-0.5 text-xs">
 <TrendArrow value={benchmarkChange} />
 <span className={clsx(benchmarkChange > 0 ?"text-positive" : benchmarkChange < 0 ?"text-danger" :"text-text-muted")}>
 {formatSigned(benchmarkChange, 1,"")}
 </span>
 </span>
 )}
 </div>
 <p className="mt-1 text-xs text-text-muted">初期日=100</p>
  <Sparkline data={benchmarkSparkData} color={CHART_SERIES.benchmark} gradientId="spark-bench" />
 </motion.div>

 {/* Card 3: Excess Return */}
 <motion.div
 variants={staggerItemVariants}
 className={clsx(
"card-surface group relative overflow-hidden p-5 transition-all duration-300",
 excessTone ==="positive" ?"border-positive/15 hover:shadow-elevated" :"border-danger/15"
 )}
 style={{
 background:
 excessTone ==="positive"
 ?"linear-gradient(135deg, rgba(19,34,56,0.92) 0%, rgba(91,240,186,0.06) 100%)"
 :"linear-gradient(135deg, rgba(19,34,56,0.92) 0%, rgba(255,135,152,0.06) 100%)"
 }}
 >
 <div className={clsx("absolute inset-y-0 left-0 w-[2px]", excessTone ==="positive" ?"bg-positive/50" :"bg-danger/50")} />
 <p className="text-[10px] uppercase tracking-widest text-text-muted">超過リターン</p>
 <p
 className={clsx(
"mt-1.5 font-mono tabular-nums text-3xl md:text-4xl font-semibold tracking-kpi",
 excessTone ==="positive" ?"text-positive" :"text-danger"
 )}
 >
 <AnimatedNumber value={excessReturn} duration={0.8} formatFn={(n) => `${n >= 0 ? "+" : "\u2212"}${Math.abs(n).toFixed(1)}`} />
 <span className="ml-1 text-sm font-normal opacity-60">pt</span>
 </p>
 <p className="mt-1 text-xs text-text-muted">戦略 − ベンチマーク</p>
 <ExcessBars managerSeries={managerSeries} benchmarkSeries={benchmarkSeries} />
 </motion.div>

 {/* Card 4: Watch / Holdings */}
 <motion.div variants={staggerItemVariants} className="card-surface card-surface-hover group relative overflow-hidden p-5 transition-all duration-300">
 <div className="absolute inset-y-0 left-0 w-[2px] bg-amber/50" />
 <p className="text-[10px] uppercase tracking-widest text-text-muted">銘柄サマリー</p>
 <p className="mt-1.5 font-mono tabular-nums text-3xl md:text-4xl font-semibold tracking-kpi text-text-primary">
 <AnimatedNumber value={totalCount} duration={0.6} formatFn={(n) => String(Math.round(n))} />
 </p>
 <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-text-muted">
 <span>監視: <span className="text-text-secondary">{watchCount}銘柄</span></span>
 <span>保有: <span className="text-text-secondary">{holdingsCount}銘柄</span></span>
 </div>
 <ActionDonut stocks={stocks} />
 </motion.div>

 {/* Card 5: Nikkei 225 */}
 <motion.div variants={staggerItemVariants} className="card-surface group relative overflow-hidden p-5 transition-all duration-300">
 <div className="absolute inset-y-0 left-0 w-[2px] bg-accent-warm/50" />
 <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-text-muted">
 日経平均 終値 <TrendArrow value={diff} />
 </p>
 <p className="mt-1.5 font-mono tabular-nums text-3xl md:text-4xl font-semibold tracking-kpi text-text-primary">
 {nikkei?.latestClose != null
 ? <><AnimatedNumber value={Math.round(nikkei.latestClose)} duration={0.8} formatFn={(n) => Math.round(n).toLocaleString("ja-JP")} /><span>円</span></>
 :"-"}
 </p>
 <p
 className={clsx(
"mt-1 text-xs",
 diff != null && diff > 0 ?"text-danger" : diff != null && diff < 0 ?"text-positive" :"text-text-muted"
 )}
 >
 {formatSigned(diff, 0,"円")} ({formatSigned(diffPercent, 2,"%")})
 </p>
 {nikkei?.sourceLabel && (
 <p className="mt-0.5 text-[10px] text-text-muted">{nikkei.sourceLabel}</p>
 )}
 {nikkeiSparkData.length >= 2 && (
  <Sparkline data={nikkeiSparkData} color={CHART_SERIES.nikkei} gradientId="spark-nikkei" />
 )}
 </motion.div>
 </motion.section>
 );
}

export const KpiCards = React.memo(KpiCardsInner);

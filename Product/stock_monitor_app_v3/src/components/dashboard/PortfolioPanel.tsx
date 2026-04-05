"use client";

import React, { useMemo, useState } from "react";
import clsx from "clsx";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatActionLabel, formatPercent, formatYen, actionTone } from "@/lib/format";
import { useStockStore } from "@/store/useStockStore";
import type { EvaluatedStock, StockAction } from "@/types/stock";
import { CHART_COLORS, CHART_TOOLTIP_STYLE } from "@/components/ui/ChartTheme";
import { Badge } from "@/components/ui/Badge";

/* ───────── palette ───────── */
const SECTOR_COLORS = [
  "#5bf0ba", // mint
  "#8bb0ff", // blue
  "#ffc772", // amber
  "#ff8798", // danger
  "#a78bfa", // violet
  "#f472b6", // pink
  "#38bdf8", // sky
  "#e8a87c", // warm accent
];

const ACTION_COLOR: Record<string, string> = {
  buy_now: "#5bf0ba",
  wait_earnings: "#8bb0ff",
  wait_pullback: "#8bb0ff",
  exclude: "#ff8798",
};

/* ───────── types ───────── */
interface HoldingRow {
  stock: EvaluatedStock;
  shares: number;
  value: number;
  weight: number;
}

interface SectorSlice {
  name: string;
  value: number;
  percent: number;
  fill: string;
}

type SortField = "value" | "score" | "shares" | "weight";

/* ───────── tooltip style ───────── */
const tooltipStyle: React.CSSProperties = {
  ...CHART_TOOLTIP_STYLE,
  backdropFilter: "blur(8px)",
  color: "#e0ffe0",
};

/* ───────── custom tooltip renderers ───────── */
function BarTooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; changePercent: number } }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const color = d.changePercent >= 0 ? "#ff8798" : "#5bf0ba"; // 赤=プラス, 緑=マイナス
  return (
    <div style={tooltipStyle} className="px-3 py-2">
      <p className="text-xs text-text-secondary">{d.name}</p>
      <p className="mt-1 text-sm font-semibold" style={{ color }}>
        {formatYen(Math.round(d.value))}
      </p>
    </div>
  );
}

function PieTooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: SectorSlice }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0];
  return (
    <div style={tooltipStyle} className="px-3 py-2">
      <p className="text-xs text-text-secondary">{d.name}</p>
      <p className="mt-1 text-sm font-semibold text-text-primary">
        {formatYen(Math.round(d.value))}
      </p>
      <p className="text-[10px] text-text-muted">{d.payload.percent.toFixed(1)}%</p>
    </div>
  );
}

/* ───────── score color helper ───────── */
function scoreColor(score: number): string {
  if (score >= 75) return "text-mint";
  if (score >= 50) return "text-blue";
  if (score >= 30) return "text-amber";
  return "text-danger";
}

/* ═══════════════════════════════════════════ */
/*  PortfolioPanel                             */
/* ═══════════════════════════════════════════ */
function PortfolioPanelInner(): JSX.Element {
  const stocks = useStockStore((s) => s.stocks);
  const holdingsMap = useStockStore((s) => s.holdingsMap);

  const [tableSortField, setTableSortField] = useState<SortField>("value");
  const [tableSortAsc, setTableSortAsc] = useState(false);

  /* ── derived data ── */
  const holdingRows = useMemo<HoldingRow[]>(() => {
    const rows: HoldingRow[] = [];
    for (const stock of stocks) {
      const shares = holdingsMap[stock.id] ?? 0;
      if (shares <= 0) continue;
      const value = shares * stock.price;
      rows.push({ stock, shares, value, weight: 0 });
    }
    const total = rows.reduce((s, r) => s + r.value, 0);
    for (const r of rows) {
      r.weight = total > 0 ? r.value / total : 0;
    }
    return rows;
  }, [stocks, holdingsMap]);

  const totalValue = useMemo(() => holdingRows.reduce((s, r) => s + r.value, 0), [holdingRows]);
  const stockCount = holdingRows.length;

  const weightedAvgScore = useMemo(() => {
    if (totalValue === 0) return 0;
    return holdingRows.reduce((s, r) => s + r.stock.score * r.weight, 0);
  }, [holdingRows, totalValue]);

  const dailyChange = useMemo(
    () =>
      holdingRows.reduce(
        (s, r) => s + r.shares * r.stock.price * (r.stock.changePercent / 100),
        0,
      ),
    [holdingRows],
  );

  const dailyChangePct = useMemo(
    () => (totalValue > 0 ? (dailyChange / (totalValue - dailyChange)) * 100 : 0),
    [dailyChange, totalValue],
  );

  /* sector pie data */
  const sectorData = useMemo<SectorSlice[]>(() => {
    const map = new Map<string, number>();
    for (const r of holdingRows) {
      map.set(r.stock.sector, (map.get(r.stock.sector) ?? 0) + r.value);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({
        name,
        value,
        percent: totalValue > 0 ? (value / totalValue) * 100 : 0,
        fill: SECTOR_COLORS[i % SECTOR_COLORS.length],
      }));
  }, [holdingRows, totalValue]);

  /* bar chart data */
  const barData = useMemo(
    () =>
      [...holdingRows]
        .sort((a, b) => b.value - a.value)
        .map((r) => ({
          name: r.stock.name,
          value: r.value,
          pct: r.weight * 100,
          action: r.stock.evaluatedAction,
          changePercent: r.stock.changePercent,
        })),
    [holdingRows],
  );

  /* sorted table rows */
  const sortedRows = useMemo(() => {
    const rows = [...holdingRows];
    rows.sort((a, b) => {
      let diff = 0;
      switch (tableSortField) {
        case "value":
          diff = a.value - b.value;
          break;
        case "score":
          diff = a.stock.score - b.stock.score;
          break;
        case "shares":
          diff = a.shares - b.shares;
          break;
        case "weight":
          diff = a.weight - b.weight;
          break;
      }
      return tableSortAsc ? diff : -diff;
    });
    return rows;
  }, [holdingRows, tableSortField, tableSortAsc]);

  /* action distribution */
  const actionCounts = useMemo(() => {
    const counts: Record<StockAction, number> = {
      buy_now: 0,
      wait_earnings: 0,
      wait_pullback: 0,
      exclude: 0,
    };
    for (const r of holdingRows) {
      counts[r.stock.evaluatedAction]++;
    }
    return counts;
  }, [holdingRows]);

  const lowestScoreRow = useMemo(
    () =>
      holdingRows.length > 0
        ? holdingRows.reduce((min, r) => (r.stock.score < min.stock.score ? r : min))
        : null,
    [holdingRows],
  );

  /* ── table sort handler ── */
  function handleSort(field: SortField) {
    if (tableSortField === field) {
      setTableSortAsc((prev) => !prev);
    } else {
      setTableSortField(field);
      setTableSortAsc(false);
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (tableSortField !== field) return <span className="ml-1 text-text-muted/40">⇅</span>;
    return <span className="ml-1 text-mint">{tableSortAsc ? "↑" : "↓"}</span>;
  }

  /* ── empty state ── */
  if (holdingRows.length === 0) {
    return (
      <section className="card-surface p-8 text-center">
        <h2 className="mb-3 text-lg font-semibold font-orb text-text-primary">ポートフォリオ</h2>
        <p className="text-sm text-text-muted">
          ポートフォリオが空です。銘柄カードの保有数入力から株数を設定してください。
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      {/* ── Section 1: KPI Summary ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* 総評価額 */}
        <div className="card-surface relative overflow-hidden p-5">
          <div className="absolute inset-y-0 left-0 w-[3px] bg-mint/50" />
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
            総評価額
          </p>
          <p className="mt-2 text-3xl font-semibold font-mono-tech tracking-kpi text-text-primary md:text-4xl">
            {formatYen(Math.round(totalValue))}
          </p>
          <p className="mt-2 text-xs text-text-muted">保有全銘柄の時価合計</p>
        </div>

        {/* 銘柄数 */}
        <div className="card-surface relative overflow-hidden p-5">
          <div className="absolute inset-y-0 left-0 w-[3px] bg-blue/50" />
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
            銘柄数
          </p>
          <p className="mt-2 text-3xl font-semibold font-mono-tech tracking-kpi text-text-primary md:text-4xl">
            {stockCount}
          </p>
          <p className="mt-2 text-xs text-text-muted">保有中の銘柄</p>
        </div>

        {/* 加重平均スコア */}
        <div className="card-surface relative overflow-hidden p-5">
          <div className="absolute inset-y-0 left-0 w-[3px] bg-amber/50" />
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
            加重平均スコア
          </p>
          <p
            className={clsx(
              "mt-2 text-3xl font-semibold font-mono-tech tracking-kpi md:text-4xl",
              scoreColor(weightedAvgScore),
            )}
          >
            {weightedAvgScore.toFixed(1)}
          </p>
          <p className="mt-2 text-xs text-text-muted">評価額ベースの加重平均</p>
        </div>

        {/* 前日比 */}
        <div className="card-surface relative overflow-hidden p-5">
          <div
            className={clsx(
              "absolute inset-y-0 left-0 w-[3px]",
              dailyChange >= 0 ? "bg-mint/50" : "bg-danger/50",
            )}
          />
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
            前日比
          </p>
          <p
            className={clsx(
              "mt-2 text-3xl font-semibold font-mono-tech tracking-kpi md:text-4xl",
              dailyChange >= 0 ? "text-mint" : "text-danger",
            )}
          >
            {dailyChange >= 0 ? "+" : ""}
            {formatYen(Math.round(dailyChange))}
          </p>
          <p
            className={clsx(
              "mt-2 text-xs font-mono-tech",
              dailyChange >= 0 ? "text-mint/70" : "text-danger/70",
            )}
          >
            {formatPercent(dailyChangePct)}
          </p>
        </div>
      </div>

      {/* ── Section 2 + 3: Charts row ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Sector Donut */}
        <div className="card-surface p-5">
          <h3 className="mb-4 text-sm font-semibold font-orb text-text-primary">セクター構成</h3>
          <div className="relative h-[280px] w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={sectorData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {sectorData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center text */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-text-muted">合計</span>
              <span className="text-sm font-semibold font-mono-tech text-text-primary">
                {formatYen(Math.round(totalValue))}
              </span>
            </div>
          </div>
          {/* Legend */}
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
            {sectorData.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: s.fill }}
                />
                {s.name} ({s.percent.toFixed(1)}%)
              </div>
            ))}
          </div>
        </div>

        {/* Holdings Bar Chart */}
        <div className="card-surface p-5">
          <h3 className="mb-4 text-sm font-semibold font-orb text-text-primary">銘柄別評価額</h3>
          <div className="h-[280px] w-full" style={{ minHeight: Math.max(280, barData.length * 40) }}>
            <ResponsiveContainer>
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 4, right: 40, left: 4, bottom: 4 }}
              >
                <XAxis
                  type="number"
                  stroke={CHART_COLORS.axis}
                  tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                  tickFormatter={(v: number) => formatYen(Math.round(v))}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  stroke={CHART_COLORS.axis}
                  tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                />
                <Tooltip content={<BarTooltipContent />} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {barData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={ACTION_COLOR[entry.action] ?? "#8bb0ff"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Section 4: Holdings Table ── */}
      <div className="card-surface overflow-x-auto p-5">
        <h3 className="mb-4 text-sm font-semibold font-orb text-text-primary">保有銘柄一覧</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
              <th className="pb-2 pr-3">銘柄</th>
              <th className="pb-2 pr-3">セクター</th>
              <th
                className="cursor-pointer pb-2 pr-3 hover:text-text-primary"
                onClick={() => handleSort("shares")}
              >
                保有数
                <SortIcon field="shares" />
              </th>
              <th className="pb-2 pr-3">単価</th>
              <th
                className="cursor-pointer pb-2 pr-3 hover:text-text-primary"
                onClick={() => handleSort("value")}
              >
                評価額
                <SortIcon field="value" />
              </th>
              <th
                className="cursor-pointer pb-2 pr-3 hover:text-text-primary"
                onClick={() => handleSort("weight")}
              >
                構成比
                <SortIcon field="weight" />
              </th>
              <th
                className="cursor-pointer pb-2 pr-3 hover:text-text-primary"
                onClick={() => handleSort("score")}
              >
                スコア
                <SortIcon field="score" />
              </th>
              <th className="pb-2">判定</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r) => (
              <tr
                key={r.stock.id}
                className="border-b border-border-subtle/50 transition-colors hover:bg-panel-hover/40"
              >
                <td className="py-2.5 pr-3 font-medium text-text-primary">
                  {r.stock.name}
                  <span className="ml-1.5 text-[10px] text-text-muted">{r.stock.code}</span>
                </td>
                <td className="py-2.5 pr-3 text-text-secondary">{r.stock.sector}</td>
                <td className="py-2.5 pr-3 text-text-secondary font-mono-tech tabular-nums">
                  {r.shares.toLocaleString("ja-JP")}
                </td>
                <td className="py-2.5 pr-3 text-text-secondary font-mono-tech tabular-nums">
                  {formatYen(r.stock.price)}
                </td>
                <td className="py-2.5 pr-3 font-medium font-mono-tech tabular-nums text-text-primary">
                  {formatYen(Math.round(r.value))}
                </td>
                <td className="py-2.5 pr-3 text-text-secondary font-mono-tech tabular-nums">
                  {(r.weight * 100).toFixed(1)}%
                </td>
                <td className={clsx("py-2.5 pr-3 font-semibold font-mono-tech tabular-nums", scoreColor(r.stock.score))}>
                  {r.stock.score.toFixed(0)}
                </td>
                <td className="py-2.5">
                  <Badge tone={actionTone(r.stock.evaluatedAction)}>
                    {formatActionLabel(r.stock.evaluatedAction)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Section 5: Risk Summary ── */}
      <div className="card-surface p-5">
        <h3 className="mb-4 text-sm font-semibold font-orb text-text-primary">ポートフォリオリスク概要</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Action distribution */}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
              判定別銘柄数
            </p>
            <div className="flex flex-col gap-1.5 text-xs">
              {actionCounts.buy_now > 0 && (
                <span className="text-mint">{actionCounts.buy_now}銘柄 今買う</span>
              )}
              {actionCounts.wait_earnings > 0 && (
                <span className="text-blue">{actionCounts.wait_earnings}銘柄 決算待ち</span>
              )}
              {actionCounts.wait_pullback > 0 && (
                <span className="text-blue">{actionCounts.wait_pullback}銘柄 押し目待ち</span>
              )}
              {actionCounts.exclude > 0 && (
                <span className="text-danger">{actionCounts.exclude}銘柄 除外</span>
              )}
            </div>
          </div>

          {/* Average score */}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
              平均スコア
            </p>
            <p className={clsx("text-2xl font-semibold font-mono-tech", scoreColor(weightedAvgScore))}>
              {weightedAvgScore.toFixed(1)}
            </p>
          </div>

          {/* Highest risk */}
          <div className="flex flex-col gap-2 sm:col-span-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
              最高リスク銘柄（最低スコア）
            </p>
            {lowestScoreRow ? (
              <div className="flex items-center gap-2">
                <span className="font-medium text-text-primary">{lowestScoreRow.stock.name}</span>
                <span className={clsx("text-sm font-semibold font-mono-tech", scoreColor(lowestScoreRow.stock.score))}>
                  {lowestScoreRow.stock.score.toFixed(0)}pt
                </span>
                <Badge tone={actionTone(lowestScoreRow.stock.evaluatedAction)}>
                  {formatActionLabel(lowestScoreRow.stock.evaluatedAction)}
                </Badge>
              </div>
            ) : (
              <span className="text-xs text-text-muted">-</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export const PortfolioPanel = React.memo(PortfolioPanelInner);

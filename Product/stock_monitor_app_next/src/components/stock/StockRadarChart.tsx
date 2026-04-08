import React from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { CHART_COLORS, CHART_SERIES } from "@/components/ui/ChartTheme";
import type { EvaluatedStock } from "@/types/stock";

// ---------------------------------------------------------------------------
// Normalization helpers (all output 0-100)
// ---------------------------------------------------------------------------

function normalizeGrowth(val: number | null): number {
  if (val === null) return 0;
  return Math.max(0, Math.min(100, (val / 50) * 100));
}

function normalizeValuation(per: number | null): number {
  if (per === null) return 50; // neutral when unknown
  // Lower PER is better. PER 5 = score 100, PER 55 = score 0
  return Math.max(0, Math.min(100, 100 - (per - 5) * 2));
}

function normalizeCF(cf: number | null): number {
  if (cf === null) return 0;
  return Math.max(0, Math.min(100, (cf / 50) * 100));
}

function normalizeMomentum(change: number): number {
  // -10% maps to 0, +10% maps to 100
  return Math.max(0, Math.min(100, (change + 10) * 5));
}

// ---------------------------------------------------------------------------
// Value formatters for the detail grid
// ---------------------------------------------------------------------------

function fmtPercent(val: number | null): string {
  if (val === null) return "-";
  return `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
}

function fmtPer(val: number | null): string {
  if (val === null) return "-";
  return val.toFixed(1);
}

function fmtCF(val: number | null): string {
  if (val === null) return "-";
  return `${val.toFixed(0)}億`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface StockRadarChartProps {
  stock: EvaluatedStock;
}

function StockRadarChartInner({ stock }: StockRadarChartProps) {
  const data = [
    { axis: "成長力", value: normalizeGrowth(stock.revenueGrowth), fullMark: 100 },
    { axis: "収益力", value: normalizeGrowth(stock.opGrowth), fullMark: 100 },
    { axis: "割安度", value: normalizeValuation(stock.per), fullMark: 100 },
    { axis: "キャッシュ", value: normalizeCF(stock.operatingCF), fullMark: 100 },
    { axis: "モメンタム", value: normalizeMomentum(stock.changePercent), fullMark: 100 },
    { axis: "総合力", value: stock.score, fullMark: 100 },
  ];

  const details: { label: string; value: string }[] = [
    { label: "成長力", value: fmtPercent(stock.revenueGrowth) },
    { label: "収益力", value: fmtPercent(stock.opGrowth) },
    { label: "PER", value: fmtPer(stock.per) },
    { label: "CF", value: fmtCF(stock.operatingCF) },
    { label: "変動", value: `${stock.changePercent >= 0 ? "+" : ""}${stock.changePercent.toFixed(1)}%` },
    { label: "スコア", value: String(stock.score) },
  ];

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <defs>
            <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_SERIES.radar} stopOpacity={0.28} />
              <stop offset="100%" stopColor={CHART_SERIES.radar} stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <PolarGrid gridType="polygon" stroke={CHART_COLORS.grid} />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="評価"
            dataKey="value"
            stroke={CHART_SERIES.radar}
            fill="url(#radarGradient)"
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-x-4 gap-y-1 px-2 mt-1">
        {details.map((d) => (
          <div key={d.label} className="flex items-baseline gap-1">
            <span className="text-[10px] text-text-muted">{d.label}</span>
            <span className="text-xs font-mono tabular-nums text-text-secondary font-medium">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const StockRadarChart = React.memo(StockRadarChartInner);

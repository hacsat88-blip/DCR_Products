"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { NeonButton, NeonCard } from "@/components/ui";

interface PortfolioRow {
  id: number;
  code: string;
  name: string;
  market: "JP" | "US";
  marketValueJpy: number;
  weightPercent: number;
}

interface PortfolioResponse {
  data: PortfolioRow[];
}

async function fetchPortfolio(): Promise<PortfolioResponse> {
  const res = await fetch("/api/portfolio", { cache: "no-store" });
  if (!res.ok) throw new Error(`portfolio ${res.status}`);
  return res.json();
}

const PALETTE = [
  "#00E1FF",
  "#2A6BFF",
  "#B86BFF",
  "#34d399",
  "#FF3B6B",
  "#fbbf24",
  "#a78bfa",
  "#f472b6",
];

type Mode = "symbol" | "sector";

interface Slice {
  key: string;
  label: string;
  value: number;
}

export interface PortfolioCompositionChartProps {
  defaultMode?: Mode;
  height?: number;
}

function buildSlices(rows: PortfolioRow[], mode: Mode): Slice[] {
  if (mode === "symbol") {
    return rows
      .filter((r) => r.marketValueJpy > 0)
      .map((r) => ({
        key: `${r.market}:${r.code}`,
        label: `${r.code} (${r.name})`,
        value: r.marketValueJpy,
      }));
  }
  // セクター: 真のセクターデータが未取得なため市場 (JP/US) で代替集計
  const buckets = new Map<string, number>();
  for (const r of rows) {
    if (r.marketValueJpy <= 0) continue;
    const k = r.market === "JP" ? "日本株" : "米国株";
    buckets.set(k, (buckets.get(k) ?? 0) + r.marketValueJpy);
  }
  return Array.from(buckets, ([label, value]) => ({
    key: label,
    label,
    value,
  }));
}

export function PortfolioCompositionChart({
  defaultMode = "symbol",
  height = 260,
}: PortfolioCompositionChartProps) {
  const [mode, setMode] = React.useState<Mode>(defaultMode);
  const q = useQuery({
    queryKey: ["portfolio-composition"],
    queryFn: fetchPortfolio,
    staleTime: 5 * 60 * 1000,
  });
  const rows = React.useMemo(() => q.data?.data ?? [], [q.data]);
  const slices = React.useMemo(() => buildSlices(rows, mode), [rows, mode]);
  const total = slices.reduce((s, x) => s + x.value, 0);

  return (
    <NeonCard className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <h2 className="heading-en text-sm text-text/70">COMPOSITION</h2>
        <div className="flex gap-1" role="tablist" aria-label="集計軸">
          <NeonButton
            size="sm"
            variant={mode === "symbol" ? "primary" : "ghost"}
            onClick={() => setMode("symbol")}
            aria-pressed={mode === "symbol"}
          >
            銘柄
          </NeonButton>
          <NeonButton
            size="sm"
            variant={mode === "sector" ? "primary" : "ghost"}
            onClick={() => setMode("sector")}
            aria-pressed={mode === "sector"}
          >
            セクター
          </NeonButton>
        </div>
      </div>
      <div style={{ height }}>
        {slices.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-text/50">
            {q.isLoading ? "LOADING..." : "ポジション未登録"}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                {PALETTE.map((c, i) => (
                  <radialGradient
                    key={i}
                    id={`pcc-grad-${i}`}
                    cx="50%"
                    cy="50%"
                    r="70%"
                  >
                    <stop offset="0%" stopColor={c} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={c} stopOpacity={0.55} />
                  </radialGradient>
                ))}
              </defs>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="label"
                innerRadius="45%"
                outerRadius="78%"
                paddingAngle={1}
                stroke="rgba(5,11,26,0.85)"
              >
                {slices.map((_, i) => (
                  <Cell key={i} fill={`url(#pcc-grad-${i % PALETTE.length})`} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "rgba(5,11,26,0.95)",
                  border: "1px solid rgba(0,225,255,0.4)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(value, _name, p) => {
                  const num =
                    typeof value === "number" ? value : Number(value ?? 0);
                  const pct =
                    total > 0 ? ((num / total) * 100).toFixed(1) + "%" : "-";
                  const label =
                    (p as { payload?: { label?: string } } | undefined)
                      ?.payload?.label ?? "";
                  return [
                    `¥${Math.round(num).toLocaleString()} (${pct})`,
                    label,
                  ];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      {slices.length > 0 && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-text/70">
          {slices.slice(0, 8).map((s, i) => (
            <li key={s.key} className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: PALETTE[i % PALETTE.length] }}
              />
              <span>{s.label}</span>
            </li>
          ))}
        </ul>
      )}
    </NeonCard>
  );
}

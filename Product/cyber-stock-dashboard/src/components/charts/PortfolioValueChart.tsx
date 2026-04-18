"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { NeonButton, NeonCard } from "@/components/ui";

export type PortfolioRange = "7d" | "30d" | "90d" | "1y";

interface SnapshotRow {
  id: number;
  date: string;
  totalValueJpy: number;
  pnlJpy: number;
}

interface SnapshotResponse {
  items: SnapshotRow[];
  range: PortfolioRange;
}

async function fetchSnapshots(range: PortfolioRange): Promise<SnapshotResponse> {
  const res = await fetch(`/api/portfolio/snapshot?range=${range}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`portfolio snapshot ${res.status}`);
  return res.json();
}

const RANGES: PortfolioRange[] = ["7d", "30d", "90d", "1y"];

export interface PortfolioValueChartProps {
  defaultRange?: PortfolioRange;
  height?: number;
}

export function PortfolioValueChart({
  defaultRange = "30d",
  height = 260,
}: PortfolioValueChartProps) {
  const [range, setRange] = React.useState<PortfolioRange>(defaultRange);
  const q = useQuery({
    queryKey: ["portfolio-snapshot", range],
    queryFn: () => fetchSnapshots(range),
    staleTime: 5 * 60 * 1000,
  });
  const items = q.data?.items ?? [];

  return (
    <NeonCard className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <h2 className="heading-en text-sm text-text/70">PORTFOLIO VALUE</h2>
        <div className="flex gap-1" role="tablist" aria-label="期間">
          {RANGES.map((r) => (
            <NeonButton
              key={r}
              size="sm"
              variant={r === range ? "primary" : "ghost"}
              onClick={() => setRange(r)}
              aria-pressed={r === range}
            >
              {r}
            </NeonButton>
          ))}
        </div>
      </div>
      <div style={{ height }}>
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-text/50">
            {q.isLoading
              ? "LOADING..."
              : q.isError
                ? "取得失敗"
                : "スナップショット未蓄積"}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={items}
              margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
            >
              <CartesianGrid stroke="rgba(0,225,255,0.08)" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                stroke="rgba(244,250,255,0.4)"
                tick={{ fontSize: 10 }}
                minTickGap={24}
              />
              <YAxis
                stroke="rgba(244,250,255,0.4)"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) =>
                  typeof v === "number"
                    ? `¥${Math.round(v / 1000).toLocaleString()}k`
                    : String(v)
                }
                width={70}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(5,11,26,0.95)",
                  border: "1px solid rgba(0,225,255,0.4)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                labelFormatter={(label) => `日付: ${label}`}
                formatter={(value, name) => {
                  const num =
                    typeof value === "number" ? value : Number(value ?? 0);
                  const label =
                    name === "totalValueJpy"
                      ? "評価額"
                      : name === "pnlJpy"
                        ? "損益"
                        : String(name);
                  return [`¥${Math.round(num).toLocaleString()}`, label];
                }}
              />
              <Line
                type="monotone"
                dataKey="totalValueJpy"
                stroke="#00E1FF"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#00E1FF" }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="pnlJpy"
                stroke="#B86BFF"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 3"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </NeonCard>
  );
}

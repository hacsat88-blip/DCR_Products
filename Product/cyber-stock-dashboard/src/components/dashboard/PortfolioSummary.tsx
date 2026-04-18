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
import { NeonCard, Stat } from "@/components/ui";

interface PortfolioRow {
  id: number;
  code: string;
  name: string;
  marketValueJpy: number;
  costJpy: number;
  pnlJpy: number;
  pnlPercent: number;
  weightPercent: number;
}

async function fetchPortfolio(): Promise<{ data: PortfolioRow[] }> {
  const res = await fetch("/api/portfolio", { cache: "no-store" });
  if (!res.ok) throw new Error(`portfolio ${res.status}`);
  return res.json();
}

const PALETTE = ["#00E1FF", "#2A6BFF", "#B86BFF", "#FF3B6B", "#34d399", "#fbbf24"];

export function PortfolioSummary() {
  const q = useQuery({
    queryKey: ["dashboard-portfolio"],
    queryFn: fetchPortfolio,
    staleTime: 5 * 60 * 1000,
  });

  const rows = q.data?.data ?? [];
  const total = rows.reduce((s, r) => s + r.marketValueJpy, 0);
  const pnl = rows.reduce((s, r) => s + r.pnlJpy, 0);
  const cost = rows.reduce((s, r) => s + r.costJpy, 0);
  const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

  return (
    <NeonCard className="flex flex-col gap-4">
      <h2 className="heading-en text-sm text-text/70">PORTFOLIO</h2>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="評価額 (JPY)"
          value={Math.round(total).toLocaleString()}
        />
        <Stat
          label="損益 (JPY)"
          value={Math.round(pnl).toLocaleString()}
          delta={Number(pnlPct.toFixed(2))}
        />
      </div>

      <div className="h-[180px]">
        {rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-text/50">
            {q.isLoading ? "LOADING..." : "ポジション未登録"}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={rows}
                dataKey="marketValueJpy"
                nameKey="code"
                innerRadius={40}
                outerRadius={75}
                stroke="rgba(5,11,26,0.8)"
              >
                {rows.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "rgba(5,11,26,0.95)",
                  border: "1px solid rgba(0,225,255,0.3)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(v, _n, p) => {
                  const num = typeof v === "number" ? v : Number(v ?? 0);
                  const payload = (p as { payload?: { code?: string } } | undefined)
                    ?.payload;
                  return [
                    `¥${Math.round(num).toLocaleString()}`,
                    payload?.code ?? "",
                  ];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {rows.length > 0 && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-text/70">
          {rows.slice(0, 6).map((r, i) => (
            <li key={r.id} className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: PALETTE[i % PALETTE.length] }}
              />
              <span>{r.code}</span>
              <span className="tabular-nums text-text/50">
                {r.weightPercent.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </NeonCard>
  );
}

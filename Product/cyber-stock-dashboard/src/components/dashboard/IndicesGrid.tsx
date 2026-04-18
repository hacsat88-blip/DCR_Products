"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { NeonButton, NeonCard, ScanLines } from "@/components/ui";
import type { IndexRange, IndexResult } from "@/lib/services/marketIndices";
import { IndexChart } from "./IndexChart";

interface IndicesResponse {
  items: IndexResult[];
  range: IndexRange;
  asOf: string;
}

async function fetchIndices(range: IndexRange): Promise<IndicesResponse> {
  const res = await fetch(`/api/indices?range=${range}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`indices ${res.status}`);
  return res.json();
}

export function IndicesGrid() {
  const [range, setRange] = React.useState<IndexRange>("daily");
  const q = useQuery({
    queryKey: ["indices", range],
    queryFn: () => fetchIndices(range),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <h2 className="heading-en text-sm text-text/70">MARKET INDICES</h2>
        <div className="flex gap-2" role="tablist" aria-label="チャート期間">
          <NeonButton
            size="sm"
            variant={range === "daily" ? "primary" : "ghost"}
            onClick={() => setRange("daily")}
            aria-pressed={range === "daily"}
          >
            日足
          </NeonButton>
          <NeonButton
            size="sm"
            variant={range === "weekly" ? "primary" : "ghost"}
            onClick={() => setRange("weekly")}
            aria-pressed={range === "weekly"}
          >
            週足
          </NeonButton>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {q.isLoading || !q.data
          ? Array.from({ length: 5 }).map((_, i) => (
              <NeonCard key={i} className="h-[200px] animate-pulse">
                <span className="heading-en text-xs text-text/50">
                  LOADING...
                </span>
              </NeonCard>
            ))
          : q.data.items.map((item) => (
              <IndexCard key={item.id} item={item} onRetry={() => q.refetch()} />
            ))}
      </div>
    </section>
  );
}

function IndexCard({
  item,
  onRetry,
}: {
  item: IndexResult;
  onRetry: () => void;
}) {
  const isUp = (item.latest?.change ?? 0) >= 0;
  const color = isUp ? "#34d399" : "#FF3B6B";
  return (
    <NeonCard
      glow={item.status === "error" ? "alert" : "subtle"}
      className="relative overflow-hidden p-4"
    >
      <ScanLines />
      <div className="relative flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="heading-en text-[10px] text-text/60">{item.id}</p>
            <h3 className="text-base font-semibold text-neon">{item.label}</h3>
          </div>
          {item.latest && (
            <div className="text-right">
              <div className="text-base font-semibold tabular-nums text-text">
                {item.latest.close.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </div>
              <div
                className={`text-[11px] tabular-nums ${
                  isUp ? "text-emerald-300" : "text-alert"
                }`}
              >
                {isUp ? "▲" : "▼"} {item.latest.changePercent.toFixed(2)}%
              </div>
            </div>
          )}
        </div>

        {item.status === "ok" ? (
          <IndexChart data={item.data} height={120} color={color} />
        ) : (
          <div className="flex h-[120px] flex-col items-center justify-center gap-2 text-center">
            <p className="text-xs text-alert">データ取得失敗</p>
            {item.error && (
              <p className="text-[10px] text-text/50">{item.error}</p>
            )}
            <NeonButton size="sm" variant="ghost" onClick={onRetry}>
              再試行
            </NeonButton>
          </div>
        )}
      </div>
    </NeonCard>
  );
}

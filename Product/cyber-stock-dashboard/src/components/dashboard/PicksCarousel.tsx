"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { NeonCard } from "@/components/ui";
import type {
  AuditData,
  OperationData,
  SparklinePoint,
} from "@/components/cards";
import type { Signal } from "@/components/ui";
import type { StockAnalysis } from "@/lib/llm/schemas";

interface PickApi {
  symbol: string;
  market: "JP" | "US";
  name: string;
  price: number;
  currency: "JPY" | "USD";
  analysis?: StockAnalysis;
}

interface PickRow {
  symbol: string;
  market: "JP" | "US";
  name: string;
  operation: OperationData;
  audit?: AuditData;
}

type FlipProps = {
  symbol: string;
  market: "JP" | "US";
  name: string;
  operation: OperationData;
  audit?: AuditData;
  defaultFace?: "operation" | "audit";
};

const FallbackCard: React.ComponentType<FlipProps> = () => (
  <NeonCard className="flex h-96 w-full max-w-[20rem] items-center justify-center sm:w-80">
    <span className="heading-en text-xs text-text/60">カード準備中</span>
  </NeonCard>
);
FallbackCard.displayName = "StockCardFallback";

const StockCardFlipLazy = dynamic<FlipProps>(
  () =>
    import("@/components/cards/StockCardFlip")
      .then((m) => m.StockCardFlip as React.ComponentType<FlipProps>)
      .catch(() => FallbackCard),
  {
    ssr: false,
    loading: () => (
      <NeonCard className="flex h-96 w-full max-w-[20rem] items-center justify-center sm:w-80">
        <span className="heading-en text-xs text-text/60">LOADING...</span>
      </NeonCard>
    ),
  },
);

function makeSparkline(seed: number): SparklinePoint[] {
  const out: SparklinePoint[] = [];
  let v = 100 + (seed % 50);
  for (let i = 0; i < 24; i++) {
    v += Math.sin(i / 2 + seed) * 1.2;
    out.push({
      time: `2025-01-${String(i + 1).padStart(2, "0")}`,
      value: v,
    });
  }
  return out;
}

function signalFromScore(score: number): Signal {
  if (score >= 70) return "go";
  if (score >= 45) return "fix";
  return "stop";
}

function toAudit(a: StockAnalysis): AuditData {
  return {
    scores: {
      movement: a.scores.a,
      volume: a.scores.b,
      catalyst: a.scores.c,
      fundamental: a.scores.d,
      risk: a.scores.e,
    },
    scenarios: {
      short: `${a.scenarios.short.up} / ${a.scenarios.short.mid} / ${a.scenarios.short.down}`,
      mid: `${a.scenarios.mid.up} / ${a.scenarios.mid.mid} / ${a.scenarios.mid.down}`,
      long: `${a.scenarios.long.up} / ${a.scenarios.long.mid} / ${a.scenarios.long.down}`,
    },
    risks: a.risks,
    signal: signalFromScore(a.totalScore),
    totalScore: a.totalScore,
  };
}

function toRow(p: PickApi, idx: number): PickRow {
  return {
    symbol: p.symbol,
    market: p.market,
    name: p.name,
    operation: {
      price: p.price,
      change: 0,
      changePercent: 0,
      currency: p.currency,
      sparkline: makeSparkline(idx + 1),
    },
    audit: p.analysis ? toAudit(p.analysis) : undefined,
  };
}

interface PicksResponse {
  items: PickApi[];
  warnings?: string[];
}

async function fetchPicks(): Promise<PickRow[]> {
  const res = await fetch("/api/picks", { cache: "no-store" });
  if (!res.ok) throw new Error(`picks ${res.status}`);
  const json = (await res.json()) as PicksResponse;
  return (json.items ?? []).map(toRow);
}

export function PicksCarousel() {
  const q = useQuery({
    queryKey: ["dashboard-picks"],
    queryFn: fetchPicks,
    staleTime: 6 * 60 * 60 * 1000,
  });
  const items = q.data ?? [];

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <h2 className="heading-en text-sm text-text/70">本日の注目候補</h2>
        <span className="text-[10px] text-text/40">
          ※ 売買推奨ではありません
        </span>
      </div>
      <div className="-mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-2">
        {q.isLoading && items.length === 0 && (
          <NeonCard className="flex h-96 w-80 items-center justify-center">
            <span className="heading-en text-xs text-text/60">LOADING...</span>
          </NeonCard>
        )}
        {!q.isLoading && items.length === 0 && (
          <NeonCard className="flex h-96 w-80 items-center justify-center">
            <span className="heading-en text-xs text-text/60">NO DATA</span>
          </NeonCard>
        )}
        {items.map((p) => (
          <div key={`${p.market}:${p.symbol}`} className="snap-start shrink-0">
            <StockCardFlipLazy
              symbol={p.symbol}
              market={p.market}
              name={p.name}
              operation={p.operation}
              audit={p.audit}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { CandleChart } from "@/components/charts/CandleChart";
import { RadarScore } from "@/components/cards/RadarScore";
import {
  Disclaimer,
  NeonBadge,
  NeonButton,
  NeonCard,
  ScanLines,
  Stat,
} from "@/components/ui";
import type { Candle } from "@/lib/providers/types";
import type { Signal } from "@/components/ui";
import type { StockAnalysis } from "@/lib/llm/schemas";
import { GlobalTabs } from "@/components/navigation/GlobalTabs";

type Market = "jp" | "us";

interface PricesResponse {
  symbol: string;
  market: Market;
  interval: "1d" | "1w";
  candles: Candle[];
  count: number;
  source?: "jquants" | "alphaVantage" | "yahoo";
  fallbackReason?: string | null;
  error?: string;
}

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source?: string;
  publishedAt: string;
  summary?: string;
  sentimentLabel?: "positive" | "neutral" | "negative";
}

interface AnalyzeResponse {
  data?: {
    analyses: StockAnalysis[];
    candidates: { code: string; price: number; currency: "JPY" | "USD" }[];
    warnings: string[];
  };
}

function detectMarket(sym: string): Market {
  return /^[0-9]{4}(\.T)?$/.test(sym) ? "jp" : "us";
}

function signalFromScore(score: number): Signal {
  if (score >= 70) return "go";
  if (score >= 45) return "fix";
  return "stop";
}

async function fetchPrices(
  symbol: string,
  market: Market,
): Promise<PricesResponse> {
  const res = await fetch(
    `/api/prices/${encodeURIComponent(symbol)}?market=${market}&days=180`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error ?? `prices ${res.status}`);
  }
  return res.json();
}

async function fetchNews(symbol: string): Promise<{ items: NewsItem[] }> {
  const res = await fetch(
    `/api/news?symbols=${encodeURIComponent(symbol)}&limit=8`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`news ${res.status}`);
  return res.json();
}

async function fetchAnalysis(
  symbol: string,
  market: Market,
  price: number,
  currency: "JPY" | "USD",
): Promise<AnalyzeResponse> {
  const range =
    currency === "USD"
      ? { priceMin: Math.max(1, Math.floor(price * 0.5)), priceMax: Math.ceil(price * 1.5) }
      : { priceMin: Math.max(50, Math.floor(price * 0.5)), priceMax: Math.ceil(price * 1.5) };
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      market: market === "jp" ? "JP" : "US",
      currency,
      style: "総合",
      riskTolerance: "mid",
      limit: 5,
      poolLimit: 12,
      ...range,
    }),
  });
  if (!res.ok) throw new Error(`analyze ${res.status}`);
  return res.json();
}

export interface StockDetailProps {
  symbol: string;
}

export function StockDetail({ symbol }: StockDetailProps) {
  const [market, setMarket] = React.useState<Market>(() => detectMarket(symbol));

  const pricesQ = useQuery({
    queryKey: ["prices", symbol, market],
    queryFn: () => fetchPrices(symbol, market),
    staleTime: 30 * 60 * 1000,
  });

  const newsQ = useQuery({
    queryKey: ["news", symbol],
    queryFn: () => fetchNews(symbol),
    staleTime: 5 * 60 * 1000,
  });

  const lastPrice = pricesQ.data?.candles?.at(-1)?.close ?? 0;
  const currency: "JPY" | "USD" = market === "jp" ? "JPY" : "USD";

  const analysisQ = useQuery({
    queryKey: ["analyze", symbol, market, lastPrice],
    enabled: lastPrice > 0,
    queryFn: () => fetchAnalysis(symbol, market, lastPrice, currency),
    staleTime: 6 * 60 * 60 * 1000,
  });

  const matched = analysisQ.data?.data?.analyses.find(
    (a) => a.code.toUpperCase() === symbol.toUpperCase(),
  );

  const radarScores = matched
    ? {
        movement: matched.scores.a,
        volume: matched.scores.b,
        catalyst: matched.scores.c,
        fundamental: matched.scores.d,
        risk: matched.scores.e,
      }
    : null;
  const fallbackMessage = pricesQ.data?.fallbackReason;

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
      <ScanLines className="!fixed inset-0 !rounded-none opacity-30" />
      <header className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="heading-en text-xs text-text/60">
            {market.toUpperCase()} · {symbol}
          </p>
          <h1 className="heading-en text-2xl font-bold text-neon drop-shadow-[0_0_12px_rgba(0,225,255,0.7)]">
            {symbol}
          </h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <GlobalTabs />
          <div className="flex gap-2" role="tablist" aria-label="market">
            <NeonButton
              size="sm"
              variant={market === "jp" ? "primary" : "ghost"}
              onClick={() => setMarket("jp")}
              aria-pressed={market === "jp"}
            >
              JP
            </NeonButton>
            <NeonButton
              size="sm"
              variant={market === "us" ? "primary" : "ghost"}
              onClick={() => setMarket("us")}
              aria-pressed={market === "us"}
            >
              US
            </NeonButton>
          </div>
        </div>
      </header>

      <NeonCard className="relative">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            label="LAST"
            value={
              lastPrice > 0
                ? lastPrice.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : "—"
            }
          />
          <Stat
            label="POINTS"
            value={(pricesQ.data?.candles?.length ?? 0).toLocaleString()}
          />
          <Stat
            label="MARKET"
            value={market.toUpperCase()}
          />
          <Stat
            label="CCY"
            value={currency}
          />
        </div>
      </NeonCard>

      <NeonCard className="relative">
        {pricesQ.isLoading ? (
          <div className="flex h-[320px] items-center justify-center text-xs text-text/50">
            LOADING...
          </div>
        ) : pricesQ.isError ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <p className="text-xs text-alert">価格取得失敗</p>
            <NeonButton size="sm" variant="ghost" onClick={() => pricesQ.refetch()}>
              再試行
            </NeonButton>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {fallbackMessage && (
              <p className="text-[11px] text-amber-300/80">
                フォールバックデータを表示中 ({pricesQ.data?.source ?? "unknown"})
              </p>
            )}
            {fallbackMessage && (
              <p className="text-[10px] text-text/50">{fallbackMessage}</p>
            )}
            <CandleChart data={pricesQ.data?.candles ?? []} />
          </div>
        )}
      </NeonCard>

      <section className="grid gap-4 lg:grid-cols-2">
        <NeonCard className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="heading-en text-sm text-text/70">RADAR SCORE</h2>
            {matched && (
              <NeonBadge signal={signalFromScore(matched.totalScore)} />
            )}
          </div>
          {analysisQ.isLoading ? (
            <div className="flex h-40 items-center justify-center text-xs text-text/50">
              LOADING...
            </div>
          ) : radarScores ? (
            <RadarScore scores={radarScores} />
          ) : (
            <div className="flex h-40 items-center justify-center text-xs text-text/50">
              スコア未取得 ({analysisQ.isError ? "失敗" : "範囲外"})
            </div>
          )}
          {matched && (
            <ul className="text-[11px] text-text/70">
              <li>
                <span className="heading-en text-[10px] text-text/50">SHORT</span>{" "}
                {matched.scenarios.short.mid}
              </li>
              <li>
                <span className="heading-en text-[10px] text-text/50">MID</span>{" "}
                {matched.scenarios.mid.mid}
              </li>
              <li>
                <span className="heading-en text-[10px] text-text/50">LONG</span>{" "}
                {matched.scenarios.long.mid}
              </li>
            </ul>
          )}
        </NeonCard>

        <NeonCard className="flex flex-col gap-3">
          <h2 className="heading-en text-sm text-text/70">RELATED NEWS</h2>
          {newsQ.isLoading ? (
            <div className="text-xs text-text/50">LOADING...</div>
          ) : (newsQ.data?.items ?? []).length === 0 ? (
            <div className="text-xs text-text/50">関連ニュースなし</div>
          ) : (
            <ul className="flex flex-col gap-2">
              {(newsQ.data?.items ?? []).slice(0, 6).map((n) => (
                <li key={n.id}>
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block rounded-md border border-text/10 p-2 transition-colors hover:border-neon/50"
                  >
                    <p className="text-[11px] text-text/50">
                      {n.source ?? "news"} · {new Date(n.publishedAt).toLocaleString("ja-JP")}
                    </p>
                    <p className="line-clamp-2 text-sm text-neon">{n.title}</p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </NeonCard>
      </section>

      <Disclaimer />
    </main>
  );
}

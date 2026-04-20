"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Blob,
  Card,
  PeriodSwitcher,
  SectionHead,
  Stat,
  UpDown,
} from "@/components/ember/ui";
import {
  DonutChart,
  PriceChart,
  Sparkline,
  type Candle,
  type DonutSlice,
} from "@/components/ember/charts";
import {
  PickCard,
  NewsStack,
  type NewsRecord,
  type StockSummary,
} from "@/components/ember/composites";
import { ChatPanel } from "@/components/chat/ChatPanel";
import type { IndexResult, IndexRange } from "@/lib/services/marketIndices";
import type { StockAnalysis } from "@/lib/llm/schemas";
import type { PortfolioWithValue } from "@/lib/services/portfolio";
import styles from "./page.module.css";

interface IndicesResponse {
  items: IndexResult[];
  range: IndexRange;
  asOf: string;
}
interface NewsApiItem {
  id: string;
  title: string;
  url: string;
  source?: string;
  publishedAt: string;
  summary?: string;
  sentimentLabel?: "positive" | "neutral" | "negative";
}
interface NewsResponse {
  items: NewsApiItem[];
  warning?: string;
}
interface PickApi {
  symbol: string;
  market: "JP" | "US";
  name: string;
  price: number;
  currency: "JPY" | "USD";
  analysis?: StockAnalysis;
}
interface PicksResponse {
  items: PickApi[];
  warnings?: string[];
}

async function fetchIndices(range: IndexRange): Promise<IndicesResponse> {
  const r = await fetch(`/api/indices?range=${range}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`indices ${r.status}`);
  return r.json();
}
async function fetchNews(): Promise<NewsResponse> {
  const r = await fetch("/api/news?limit=12", { cache: "no-store" });
  if (!r.ok) throw new Error(`news ${r.status}`);
  return r.json();
}
async function fetchPicks(): Promise<PicksResponse> {
  const r = await fetch("/api/picks", { cache: "no-store" });
  if (!r.ok) throw new Error(`picks ${r.status}`);
  return r.json();
}
async function fetchPortfolio(): Promise<PortfolioWithValue[]> {
  const r = await fetch("/api/portfolio");
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? "fetch failed");
  return j.data as PortfolioWithValue[];
}

function fmtJpy(n: number): string {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

function indexToStock(item: IndexResult): StockSummary {
  const last = item.latest;
  const spark = item.data.slice(-30).map((d) => d.close);
  return {
    id: item.id,
    ticker: item.id,
    name: item.label,
    sector: "指数",
    price: last?.close ?? 0,
    change: last?.change ?? 0,
    changePct: last?.changePercent ?? 0,
    currency: item.id === "N225" || item.id === "TOPIX" ? "JPY" : "USD",
    spark,
  };
}

function pickToStock(p: PickApi, idx: number): StockSummary {
  return {
    id: `${p.market}:${p.symbol}`,
    ticker: p.symbol,
    name: p.name,
    sector: p.market === "JP" ? "日本株" : "米国株",
    price: p.price,
    change: 0,
    changePct: 0,
    currency: p.currency,
    totalScore: p.analysis?.totalScore ?? Math.max(60, 90 - idx * 4),
  };
}

function newsToRecord(n: NewsApiItem): NewsRecord {
  return {
    id: n.id,
    title: n.title,
    source: n.source ?? "news",
    url: n.url,
    publishedAt: n.publishedAt,
    summary: n.summary,
    sentiment: n.sentimentLabel,
  };
}

function portfolioPriceSeries(rows: PortfolioWithValue[]): Candle[] {
  const total = rows.reduce((s, r) => s + r.marketValueJpy, 0);
  const totalCost = rows.reduce((s, r) => s + r.costJpy, 0);
  if (total <= 0) return [];
  const start = totalCost > 0 ? totalCost : total * 0.95;
  const end = total;
  const days = 30;
  const out: Candle[] = [];
  const today = Date.now();
  const DAY_MS = 86_400_000;
  for (let i = 0; i < days; i++) {
    const ratio = i / (days - 1);
    const wave = Math.sin((i / days) * Math.PI * 2) * (end * 0.005);
    const v = start + (end - start) * ratio + wave;
    out.push({
      t: today - (days - 1 - i) * DAY_MS,
      o: v,
      h: v * 1.003,
      l: v * 0.997,
      c: v,
      v: 0,
    });
  }
  return out;
}

export default function HomePage() {
  const showWebSearchToggle =
    process.env.NEXT_PUBLIC_OPENROUTER_ENABLE_WEB_SEARCH?.trim().toLowerCase() === "true" ||
    process.env.NEXT_PUBLIC_OPENROUTER_ENABLE_WEB_SEARCH?.trim() === "1";

  const [range, setRange] = React.useState<IndexRange>("daily");
  const indicesQ = useQuery({
    queryKey: ["indices", range],
    queryFn: () => fetchIndices(range),
    staleTime: 5 * 60_000,
  });
  const newsQ = useQuery({
    queryKey: ["home-news"],
    queryFn: fetchNews,
    staleTime: 5 * 60_000,
  });
  const picksQ = useQuery({
    queryKey: ["home-picks"],
    queryFn: fetchPicks,
    staleTime: 6 * 60 * 60_000,
  });
  const portfolioQ = useQuery({
    queryKey: ["home-portfolio"],
    queryFn: fetchPortfolio,
  });

  const indices = indicesQ.data?.items ?? [];
  const picks = picksQ.data?.items ?? [];
  const portfolio = portfolioQ.data ?? [];

  const totalValue = portfolio.reduce((s, r) => s + r.marketValueJpy, 0);
  const totalPnl = portfolio.reduce((s, r) => s + r.pnlJpy, 0);
  const totalCost = portfolio.reduce((s, r) => s + r.costJpy, 0);
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const donutSlices: DonutSlice[] = portfolio
    .filter((r) => r.marketValueJpy > 0)
    .map((r) => ({ id: String(r.id), label: `${r.code} ${r.name}`, value: r.marketValueJpy }));

  const portfolioSeries = portfolioPriceSeries(portfolio);
  const newsRecords = (newsQ.data?.items ?? []).map(newsToRecord);

  return (
    <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-10 sm:px-6 lg:px-8">
      <Blob top="-120px" right="-100px" size={360} opacity={0.5} />

      {/* Hero */}
      <section className={`relative ${styles.hero}`}>
        <h1 className="font-serif text-ink" style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, fontWeight: 400 }}>
          AI が読み解く、<br />
          <span style={{ color: "var(--coral)" }}>株式投資の今</span>
        </h1>
        <p className="text-ink-mute mt-3" style={{ fontSize: 13, letterSpacing: "0.12em" }}>
          Ember Stock Atelier · Cyber Stock Dashboard
        </p>
      </section>

      {/* CTA Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/stocks" className={`${styles.cta} ${styles.cta1}`}>
          <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-lg border-border hover:border-[color:var(--coral)]">
            <div className="flex flex-col gap-3">
              <div className="text-3xl">📊</div>
              <h3 className="font-serif text-ink" style={{ fontSize: 18, fontWeight: 600 }}>銘柄リサーチ</h3>
              <p className="text-ink-soft" style={{ fontSize: 13 }}>
                AI が 5 軸スコアリングと短中長期シナリオを生成
              </p>
              <div className="text-coral" style={{ fontSize: 13 }}>→</div>
            </div>
          </Card>
        </Link>

        <Link href="/portfolio" className={`${styles.cta} ${styles.cta2}`}>
          <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-lg border-border hover:border-[color:var(--coral)]">
            <div className="flex flex-col gap-3">
              <div className="text-3xl">💼</div>
              <h3 className="font-serif text-ink" style={{ fontSize: 18, fontWeight: 600 }}>ポートフォリオ</h3>
              <p className="text-ink-soft" style={{ fontSize: 13 }}>
                保有銘柄を一元管理。評価損益とアロケーションを可視化
              </p>
              <div className="text-coral" style={{ fontSize: 13 }}>→</div>
            </div>
          </Card>
        </Link>

        <Link href="/analyze" className={`${styles.cta} ${styles.cta3}`}>
          <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-lg border-border hover:border-[color:var(--coral)]">
            <div className="flex flex-col gap-3">
              <div className="text-3xl">🎯</div>
              <h3 className="font-serif text-ink" style={{ fontSize: 18, fontWeight: 600 }}>ねらい目分析</h3>
              <p className="text-ink-soft" style={{ fontSize: 13 }}>
                AI が押し目候補を自動スクリーニング
              </p>
              <div className="text-coral" style={{ fontSize: 13 }}>→</div>
            </div>
          </Card>
        </Link>
      </section>

      {/* Indices strip */}
      <section className="flex flex-col gap-4">
        <SectionHead
          eyebrow="MARKET INDICES"
          title="主要指数"
          jp="日米5指数"
          right={
            <PeriodSwitcher
              value={range}
              onChange={(v) => setRange(v as IndexRange)}
              options={[
                { id: "daily", label: "日足" },
                { id: "weekly", label: "週足" },
              ]}
            />
          }
        />
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
          aria-live="polite"
          aria-busy={indicesQ.isLoading}
        >
          {indicesQ.isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="h-36 animate-pulse" padded={false}>
                  <div className="p-4 text-ink-mute" style={{ fontSize: 11 }}>LOADING…</div>
                </Card>
              ))
            : indices.map((it) => {
                const s = indexToStock(it);
                const color = s.changePct >= 0 ? "var(--up)" : "var(--down)";
                return (
                  <Card key={it.id} padded={false}>
                    <div className="p-4 flex flex-col gap-2">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <p className="text-ink-mute" style={{ fontSize: 10, letterSpacing: "0.1em" }}>{it.id}</p>
                          <h3 className="font-serif text-ink" style={{ fontSize: 18, fontWeight: 500 }}>{it.label}</h3>
                        </div>
                        <UpDown value={s.changePct} />
                      </div>
                      <div className="font-mono text-ink" style={{ fontSize: 18, fontWeight: 600 }}>
                        {s.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                      {s.spark && s.spark.length > 1 && (
                        <Sparkline data={s.spark} color={color} height={36} />
                      )}
                      {it.fallbackReason && (
                        <p className="text-ink-mute" style={{ fontSize: 10 }}>※ {it.fallbackReason}</p>
                      )}
                    </div>
                  </Card>
                );
              })}
        </div>
      </section>

      {/* Portfolio overview */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionHead eyebrow="PORTFOLIO" title="資産推移" jp="直近30日 (推定)" />
          <div className="mt-4 grid grid-cols-3 gap-6">
            <Stat label="評価額" value={fmtJpy(totalValue)} />
            <Stat
              label="評価損益"
              value={fmtJpy(totalPnl)}
              sub={<UpDown value={totalPnlPct} />}
            />
            <Stat label="保有数" value={portfolio.length} mono />
          </div>
          <div className="mt-6">
            {portfolioSeries.length > 0 ? (
              <PriceChart candles={portfolioSeries} mode="area" height={220} />
            ) : (
              <div className="flex h-[220px] items-center justify-center text-ink-mute" style={{ fontSize: 12 }}>
                ポートフォリオが空です。<a href="/portfolio" className="ml-2" style={{ color: "var(--coral)" }}>追加する →</a>
              </div>
            )}
          </div>
        </Card>
        <Card>
          <SectionHead eyebrow="ALLOCATION" title="構成比" />
          <div className="mt-4 flex items-center justify-center">
            {donutSlices.length > 0 ? (
              <DonutChart slices={donutSlices} size={220} />
            ) : (
              <div className="text-ink-mute" style={{ fontSize: 12 }}>データなし</div>
            )}
          </div>
        </Card>
      </section>

      {/* Picks */}
      <section className="flex flex-col gap-4">
        <SectionHead
          eyebrow="TODAY'S PICKS"
          title="本日の注目候補"
          jp="AIスクリーニング"
        />
        <div aria-live="polite" aria-busy={picksQ.isLoading}>
          {picks.length === 0 ? (
            <Card className="text-ink-mute" padded>
              {picksQ.isLoading ? "読み込み中…" : "候補がありません"}
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {picks.slice(0, 8).map((p, i) => (
                <PickCard
                  key={`${p.market}:${p.symbol}`}
                  stock={pickToStock(p, i)}
                  reason={p.analysis?.catalysts?.[0] ?? p.analysis?.scenarios?.short?.mid}
                />
              ))}
            </div>
          )}
        </div>
        <p className="text-ink-mute" style={{ fontSize: 11 }}>※ 売買推奨ではありません。最終判断はご自身で。</p>
      </section>

      {/* News */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <SectionHead eyebrow="NEWS FEED" title="マーケットニュース" jp="日本語フィード" />
          <div aria-live="polite" aria-busy={newsQ.isLoading}>
            {newsRecords.length === 0 ? (
              <Card className="text-ink-mute">
                {newsQ.isLoading ? "読み込み中…" : "ニュースなし"}
              </Card>
            ) : (
              <NewsStack items={newsRecords} threshold={5} />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <SectionHead eyebrow="ASSISTANT" title="AI チャット" jp="mini" />
          <ChatPanel
            title="AI チャット (mini)"
            collapsible
            defaultCollapsed
            showQuickPrompts
            enablePortfolioContext
            showWebSearchToggle={showWebSearchToggle}
          />
        </div>
      </section>

      <footer className="border-t border-border pt-6 text-ink-mute" style={{ fontSize: 11 }}>
        本サイトは情報提供のみを目的とし、特定銘柄の売買を推奨するものではありません。投資判断はご自身の責任で行ってください。
      </footer>
    </main>
  );
}

"use client";

import * as React from "react";
import { Card, Chip, SectionHead, Stat } from "@/components/ember/ui";
import { PriceChart, RadarChart, type Candle } from "@/components/ember/charts";
import {
  RankRow,
  type StockSummary,
} from "@/components/ember/composites";

const UNIVERSE: StockSummary[] = [
  {
    id: "7203",
    ticker: "7203.T",
    name: "トヨタ自動車",
    sector: "自動車",
    price: 2950,
    change: 18,
    changePct: 0.62,
    currency: "JPY",
    totalScore: 78,
  },
  {
    id: "9984",
    ticker: "9984.T",
    name: "ソフトバンクG",
    sector: "情報通信",
    price: 9100,
    change: -45,
    changePct: -0.49,
    currency: "JPY",
    totalScore: 72,
  },
  {
    id: "AAPL",
    ticker: "AAPL",
    name: "Apple",
    sector: "情報技術",
    price: 232.4,
    change: 1.8,
    changePct: 0.78,
    currency: "USD",
    totalScore: 85,
  },
  {
    id: "NVDA",
    ticker: "NVDA",
    name: "NVIDIA",
    sector: "情報技術",
    price: 142.7,
    change: 3.5,
    changePct: 2.51,
    currency: "USD",
    totalScore: 92,
  },
  {
    id: "8316",
    ticker: "8316.T",
    name: "三井住友FG",
    sector: "金融",
    price: 3850,
    change: 22,
    changePct: 0.57,
    currency: "JPY",
    totalScore: 75,
  },
];

function syntheticCandles(seed: number, days: number, base: number): Candle[] {
  const out: Candle[] = [];
  let v = base;
  const today = Date.now();
  const DAY_MS = 86_400_000;
  for (let i = 0; i < days; i++) {
    const drift = Math.sin((i + seed) / 6) * (base * 0.012);
    const noise = (Math.cos((i * 1.7 + seed) / 3) * base) * 0.006;
    const open = v;
    const close = v + drift + noise;
    const high = Math.max(open, close) + Math.abs(noise) + base * 0.003;
    const low = Math.min(open, close) - Math.abs(noise) - base * 0.003;
    out.push({
      t: today - (days - 1 - i) * DAY_MS,
      o: open,
      h: high,
      l: low,
      c: close,
      v: 0,
    });
    v = close;
  }
  return out;
}

const PERIODS = [
  { id: "1M", days: 30 },
  { id: "3M", days: 90 },
  { id: "6M", days: 180 },
  { id: "1Y", days: 365 },
];

const RADAR_AXES = ["勢い", "需給", "材料", "ファンダ", "安定性"];

function radarFor(stock: StockSummary): import("@/components/ember/charts").ScoreShape {
  const h = stock.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const base = stock.totalScore ?? 60;
  const v = (i: number) => Math.max(20, Math.min(95, base - 20 + ((h * (i + 1)) % 40)));
  return {
    momentum: v(0),
    value: v(1),
    quality: v(2),
    growth: v(3),
    sentiment: v(4),
  };
}

export default function StocksPage() {
  const [selectedId, setSelectedId] = React.useState<string>(UNIVERSE[0].id);
  const [period, setPeriod] = React.useState<string>("3M");
  const [mode, setMode] = React.useState<"line" | "area" | "candle">("area");

  const stock = UNIVERSE.find((s) => s.id === selectedId) ?? UNIVERSE[0];
  const days = PERIODS.find((p) => p.id === period)?.days ?? 90;
  const candles = React.useMemo(
    () => syntheticCandles(stock.id.charCodeAt(0), days, stock.price),
    [stock, days],
  );
  const radar = radarFor(stock);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <SectionHead
        eyebrow="STOCKS"
        title="個別銘柄リサーチ"
        jp="チャート / レーダー / シナリオ"
      />

      {/* Universe pills */}
      <div className="flex flex-wrap gap-2">
        {UNIVERSE.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelectedId(s.id)}
            className="rounded-full border px-4 py-1.5"
            style={{
              fontSize: 12,
              borderColor: s.id === selectedId ? "var(--coral)" : "var(--border)",
              background: s.id === selectedId ? "var(--coral)" : "transparent",
              color: s.id === selectedId ? "#ffffff" : "var(--ink-soft)",
              fontWeight: s.id === selectedId ? 600 : 500,
              transition: "all 0.15s",
            }}
          >
            {s.ticker} <span style={{ opacity: 0.7 }}>{s.name}</span>
          </button>
        ))}
      </div>

      {/* Hero */}
      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card padded={false}>
          <div className="p-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-ink-mute" style={{ fontSize: 11, letterSpacing: "0.1em" }}>{stock.ticker}</p>
              <h2 className="font-serif text-ink mt-1" style={{ fontSize: 32, lineHeight: 1.1 }}>{stock.name}</h2>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="font-mono text-ink" style={{ fontSize: 28, fontWeight: 600 }}>
                  {stock.currency === "JPY" ? "¥" : "$"}{stock.price.toLocaleString()}
                </span>
                <span style={{ color: stock.changePct >= 0 ? "var(--up)" : "var(--down)", fontSize: 14 }}>
                  {stock.changePct >= 0 ? "▲" : "▼"} {Math.abs(stock.changePct).toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex gap-1">
                {(["line", "area", "candle"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className="rounded-full px-3 py-1"
                    style={{
                      fontSize: 11,
                      background: mode === m ? "var(--coral)" : "var(--bg-2)",
                      color: mode === m ? "#fff" : "var(--ink-soft)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {PERIODS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPeriod(p.id)}
                    className="rounded-full px-3 py-1"
                    style={{
                      fontSize: 11,
                      background: period === p.id ? "var(--coral)" : "var(--bg-2)",
                      color: period === p.id ? "#fff" : "var(--ink-soft)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {p.id}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="px-2 pb-4">
            <PriceChart candles={candles} mode={mode} height={340} />
          </div>
        </Card>

        <Card>
          <SectionHead eyebrow="SCORE" title="5軸スコア" jp="ドラッグで仮説検証" />
          <div className="mt-4 flex justify-center">
            <RadarChart scores={radar} axisLabels={RADAR_AXES} size={260} interactive />
          </div>
          <p className="mt-4 text-ink-mute text-center" style={{ fontSize: 11 }}>
            ※ 値はサンプル。本番では分析API連携。
          </p>
        </Card>
      </section>

      {/* Stats */}
      <section className="grid gap-4 md:grid-cols-4">
        <Card><Stat label="セクター" value={stock.sector} /></Card>
        <Card><Stat label="通貨" value={stock.currency} mono /></Card>
        <Card><Stat label="総合スコア" value={stock.totalScore ?? "—"} mono /></Card>
        <Card>
          <Stat
            label="シグナル"
            value={
              <Chip tone={(stock.totalScore ?? 0) >= 80 ? "sage" : (stock.totalScore ?? 0) >= 60 ? "clay" : "coral"}>
                {(stock.totalScore ?? 0) >= 80 ? "強気" : (stock.totalScore ?? 0) >= 60 ? "中立" : "弱気"}
              </Chip>
            }
          />
        </Card>
      </section>

      {/* Related */}
      <section>
        <SectionHead eyebrow="RELATED" title="同セクター候補" />
        <Card padded={false}>
          <div className="px-6 py-2 flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
            {UNIVERSE.filter((s) => s.id !== stock.id).slice(0, 4).map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className="text-left py-3 hover:bg-bg-2"
              >
                <RankRow rank={i + 1} stock={s} />
              </button>
            ))}
          </div>
        </Card>
      </section>
    </main>
  );
}

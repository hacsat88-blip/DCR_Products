"use client";

import * as React from "react";
import {
  Disclaimer,
  NeonBadge,
  NeonButton,
  NeonCard,
} from "@/components/ui";
import { GlobalTabs } from "@/components/navigation/GlobalTabs";
import {
  StockCardFlip,
  type AuditData,
  type OperationData,
} from "@/components/cards";
import type { Signal } from "@/components/ui";
import type { StockAnalysis } from "@/lib/llm/schemas";
import { ChatPanel } from "@/components/chat/ChatPanel";

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

function toOperation(price?: number, currency?: "JPY" | "USD"): OperationData {
  return {
    price: price ?? 0,
    change: 0,
    changePercent: 0,
    currency,
  };
}

type Market = "JP" | "US" | "BOTH";
type Style = "短期値幅狙い" | "中期テーマ" | "長期成長" | "配当重視" | "総合";
type Risk = "low" | "mid" | "high";

interface AnalyzeResponse {
  data?: {
    analyses: StockAnalysis[];
    candidates: { code: string; price: number; currency: "JPY" | "USD" }[];
    warnings: string[];
  };
  error?: string;
  message?: string;
  disclaimer: string;
}

const STYLES: Style[] = [
  "短期値幅狙い",
  "中期テーマ",
  "長期成長",
  "配当重視",
  "総合",
];

export default function AnalyzePage() {
  const [market, setMarket] = React.useState<Market>("JP");
  const [priceMin, setPriceMin] = React.useState<number>(100);
  const [priceMax, setPriceMax] = React.useState<number>(3000);
  const [style, setStyle] = React.useState<Style>("総合");
  const [risk, setRisk] = React.useState<Risk>("mid");
  const [theme, setTheme] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<AnalyzeResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const limit = market === "US" ? 1000 : 100000;
  const currency: "JPY" | "USD" = market === "US" ? "USD" : "JPY";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          market,
          priceMin,
          priceMax,
          currency,
          style,
          riskTolerance: risk,
          theme: theme || null,
          limit: 5,
          poolLimit: 20,
        }),
      });
      const json = (await res.json()) as AnalyzeResponse;
      setResult(json);
      if (!res.ok) {
        setError(json.message ?? json.error ?? "分析に失敗しました");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const candidates = result?.data?.candidates ?? [];
  const priceByCode = new Map(candidates.map((c) => [c.code, c]));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="heading-en text-2xl font-bold text-neon drop-shadow-[0_0_12px_rgba(0,225,255,0.8)]">
          ⚡ ねらい目銘柄スクリーナー
        </h1>
        <GlobalTabs />
      </header>

      <NeonCard glow="subtle">
        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          {/* Market */}
          <label className="flex flex-col gap-1 text-xs text-text/70">
            <span className="heading-en">MARKET</span>
            <select
              value={market}
              onChange={(e) => {
                const nextMarket = e.target.value as Market;
                const nextLimit = nextMarket === "US" ? 1000 : 100000;
                setMarket(nextMarket);
                setPriceMin((prev) => Math.min(prev, nextLimit));
                setPriceMax((prev) => Math.min(prev, nextLimit));
              }}
              className="rounded-lg border border-text/20 bg-bg/60 p-2 text-sm text-text"
            >
              <option value="JP">JP (日本株)</option>
              <option value="US">US (米国株)</option>
              <option value="BOTH">BOTH</option>
            </select>
          </label>

          {/* Style */}
          <label className="flex flex-col gap-1 text-xs text-text/70">
            <span className="heading-en">STYLE</span>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as Style)}
              className="rounded-lg border border-text/20 bg-bg/60 p-2 text-sm text-text"
            >
              {STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          {/* Price range */}
          <div className="md:col-span-2">
            <p className="heading-en text-xs text-text/70">
              PRICE RANGE ({currency}): {priceMin} – {priceMax}
            </p>
            <div className="mt-2 flex flex-col gap-2">
              <input
                aria-label="price min"
                type="range"
                min={0}
                max={limit}
                step={market === "US" ? 1 : 10}
                value={priceMin}
                onChange={(e) =>
                  setPriceMin(Math.min(Number(e.target.value), priceMax))
                }
                className="w-full"
              />
              <input
                aria-label="price max"
                type="range"
                min={0}
                max={limit}
                step={market === "US" ? 1 : 10}
                value={priceMax}
                onChange={(e) =>
                  setPriceMax(Math.max(Number(e.target.value), priceMin))
                }
                className="w-full"
              />
            </div>
          </div>

          {/* Risk */}
          <label className="flex flex-col gap-1 text-xs text-text/70">
            <span className="heading-en">RISK TOLERANCE</span>
            <select
              value={risk}
              onChange={(e) => setRisk(e.target.value as Risk)}
              className="rounded-lg border border-text/20 bg-bg/60 p-2 text-sm text-text"
            >
              <option value="low">low</option>
              <option value="mid">mid</option>
              <option value="high">high</option>
            </select>
          </label>

          {/* Theme */}
          <label className="flex flex-col gap-1 text-xs text-text/70">
            <span className="heading-en">THEME (任意)</span>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="例: 半導体 / 高配当 / AI"
              maxLength={200}
              className="rounded-lg border border-text/20 bg-bg/60 p-2 text-sm text-text"
            />
          </label>

          <div className="md:col-span-2">
            <NeonButton
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
            >
              ねらい目銘柄を分析
            </NeonButton>
          </div>
        </form>
      </NeonCard>

      {error && (
        <div className="flex items-center gap-3">
          <NeonBadge signal="stop" label="ERROR" />
          <span className="text-sm text-alert">{error}</span>
        </div>
      )}

      {result?.data?.warnings && result.data.warnings.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <NeonBadge signal="fix" label="WARN" />
          {result.data.warnings.map((w, i) => (
            <span key={i} className="text-xs text-amber-200">
              {w}
            </span>
          ))}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(result?.data?.analyses ?? []).map((a) => {
          const p = priceByCode.get(a.code);
          return (
            <StockCardFlip
              key={a.code}
              symbol={a.code}
              market={market === "US" ? "US" : "JP"}
              name={a.name}
              operation={toOperation(p?.price, p?.currency)}
              audit={toAudit(a)}
              defaultFace="audit"
            />
          );
        })}
      </section>

      <ChatPanel
        title="AI チャットで深掘り"
        context={{
          market: market === "US" ? "US" : market === "JP" ? "JP" : "JP/US",
          tickers: (result?.data?.analyses ?? []).map((a) => a.code).slice(0, 10),
          sector: theme || undefined,
        }}
      />

      <Disclaimer />
    </main>
  );
}

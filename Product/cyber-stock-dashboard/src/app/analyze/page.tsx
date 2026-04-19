"use client";

import * as React from "react";
import { Card, Chip, SectionHead, UpDown } from "@/components/ember/ui";
import { ScatterPlot, type ScatterPoint } from "@/components/ember/charts";
import {
  RankRow,
  ScenarioRow,
  type ScenarioRowData,
  type StockSummary,
} from "@/components/ember/composites";
import { ChatPanel } from "@/components/chat/ChatPanel";
import type { StockAnalysis } from "@/lib/llm/schemas";

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

const inputCls =
  "rounded-md border border-border bg-bg-2 px-3 py-2 text-sm text-ink outline-none focus:border-[color:var(--coral)]";

function analysisToScatter(a: StockAnalysis, market: Market): ScatterPoint {
  return {
    id: a.code,
    label: `${a.code} ${a.name}`,
    sector: market === "US" ? "米国株" : "日本株",
    x: 1 + (a.scores.a / 100) * 4,
    y: 1 + (a.scores.d / 100) * 4,
    size: Math.max(8, (a.totalScore / 100) * 24),
    total: a.totalScore,
  };
}

function analysisToStock(
  a: StockAnalysis,
  market: Market,
  candidates: { code: string; price: number; currency: "JPY" | "USD" }[],
): StockSummary {
  const c = candidates.find((x) => x.code === a.code);
  return {
    id: a.code,
    ticker: a.code,
    name: a.name,
    sector: market === "US" ? "米国株" : "日本株",
    price: c?.price ?? 0,
    change: 0,
    changePct: 0,
    currency: c?.currency ?? (market === "US" ? "USD" : "JPY"),
    totalScore: a.totalScore,
  };
}

function scenarios(a: StockAnalysis): ScenarioRowData[] {
  return [
    {
      horizon: "短期 (1-2週)",
      bull: a.scenarios.short.up,
      base: a.scenarios.short.mid,
      bear: a.scenarios.short.down,
    },
    {
      horizon: "中期 (1-3ヶ月)",
      bull: a.scenarios.mid.up,
      base: a.scenarios.mid.mid,
      bear: a.scenarios.mid.down,
    },
    {
      horizon: "長期 (6-12ヶ月)",
      bull: a.scenarios.long.up,
      base: a.scenarios.long.mid,
      bear: a.scenarios.long.down,
    },
  ];
}

export default function AnalyzePage() {
  const showWebSearchToggle =
    process.env.NEXT_PUBLIC_OPENROUTER_ENABLE_WEB_SEARCH?.trim().toLowerCase() === "true" ||
    process.env.NEXT_PUBLIC_OPENROUTER_ENABLE_WEB_SEARCH?.trim() === "1";

  const [market, setMarket] = React.useState<Market>("JP");
  const [priceMin, setPriceMin] = React.useState(100);
  const [priceMax, setPriceMax] = React.useState(3000);
  const [style, setStyle] = React.useState<Style>("総合");
  const [risk, setRisk] = React.useState<Risk>("mid");
  const [theme, setTheme] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<AnalyzeResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [openCode, setOpenCode] = React.useState<string | null>(null);

  const limit = market === "US" ? 1000 : 100000;
  const currency: "JPY" | "USD" = market === "US" ? "USD" : "JPY";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);
    setOpenCode(null);
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
      if (!res.ok) setError(json.message ?? json.error ?? "分析に失敗しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const analyses = result?.data?.analyses ?? [];
  const candidates = result?.data?.candidates ?? [];
  const warnings = result?.data?.warnings ?? [];
  const scatterData = analyses.map((a) => analysisToScatter(a, market));
  const open = analyses.find((a) => a.code === openCode);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <SectionHead
        eyebrow="ANALYZE"
        title="ねらい目銘柄スクリーナー"
        jp="AIによる5軸スコアリング"
      />

      {/* Form */}
      <Card>
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2" style={{ fontSize: 12 }}>
          <label className="flex flex-col gap-1 text-ink-soft">
            <span style={{ letterSpacing: "0.1em" }}>MARKET</span>
            <select
              value={market}
              onChange={(e) => {
                const m = e.target.value as Market;
                const lim = m === "US" ? 1000 : 100000;
                setMarket(m);
                setPriceMin((p) => Math.min(p, lim));
                setPriceMax((p) => Math.min(p, lim));
              }}
              className={inputCls}
            >
              <option value="JP">JP (日本株)</option>
              <option value="US">US (米国株)</option>
              <option value="BOTH">BOTH</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-ink-soft">
            <span style={{ letterSpacing: "0.1em" }}>STYLE</span>
            <select value={style} onChange={(e) => setStyle(e.target.value as Style)} className={inputCls}>
              {STYLES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <div className="md:col-span-2">
            <p className="text-ink-soft" style={{ letterSpacing: "0.1em" }}>
              PRICE RANGE ({currency}): {priceMin.toLocaleString()} – {priceMax.toLocaleString()}
            </p>
            <div className="mt-2 flex flex-col gap-2">
              <input
                type="range"
                aria-label="price min"
                min={0}
                max={limit}
                step={market === "US" ? 1 : 10}
                value={priceMin}
                onChange={(e) => setPriceMin(Math.min(Number(e.target.value), priceMax))}
                style={{ accentColor: "var(--coral)" }}
              />
              <input
                type="range"
                aria-label="price max"
                min={0}
                max={limit}
                step={market === "US" ? 1 : 10}
                value={priceMax}
                onChange={(e) => setPriceMax(Math.max(Number(e.target.value), priceMin))}
                style={{ accentColor: "var(--coral)" }}
              />
            </div>
          </div>

          <label className="flex flex-col gap-1 text-ink-soft">
            <span style={{ letterSpacing: "0.1em" }}>RISK</span>
            <select value={risk} onChange={(e) => setRisk(e.target.value as Risk)} className={inputCls}>
              <option value="low">low</option>
              <option value="mid">mid</option>
              <option value="high">high</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-ink-soft">
            <span style={{ letterSpacing: "0.1em" }}>THEME (任意)</span>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="例: 半導体 / 高配当 / AI"
              maxLength={200}
              className={inputCls}
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full px-6 py-2.5 text-white"
              style={{ background: "var(--coral)", fontSize: 13, fontWeight: 600, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "分析中…" : "ねらい目を分析"}
            </button>
          </div>
        </form>
      </Card>

      {error && (
        <Card>
          <div className="flex items-center gap-2">
            <Chip tone="coral">ERROR</Chip>
            <span style={{ color: "var(--down)", fontSize: 13 }}>{error}</span>
          </div>
        </Card>
      )}

      {warnings.length > 0 && (
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="clay">WARN</Chip>
            {warnings.map((w, i) => (
              <span key={i} className="text-ink-soft" style={{ fontSize: 12 }}>{w}</span>
            ))}
          </div>
        </Card>
      )}

      {analyses.length > 0 && (
        <section className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          <Card>
            <SectionHead eyebrow="MAP" title="勢い × 質" jp="X: 値動き / Y: ファンダ" />
            <div className="mt-4">
              <ScatterPlot
                points={scatterData}
                xAxis={{ id: "movement", label: "値動き / 勢い", min: 1, max: 5 }}
                yAxis={{ id: "fundamental", label: "ファンダメンタル", min: 1, max: 5 }}
                height={320}
                onPointClick={(p) => setOpenCode(p.id)}
              />
            </div>
          </Card>

          <Card padded={false}>
            <div className="p-6 pb-2">
              <SectionHead eyebrow="RANKING" title="候補銘柄" jp="クリックで詳細" />
            </div>
            <div className="px-6 pb-6 flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
              {analyses.map((a, i) => (
                <button
                  key={a.code}
                  type="button"
                  onClick={() => setOpenCode(a.code)}
                  className="text-left py-3 hover:bg-bg-2"
                >
                  <RankRow rank={i + 1} stock={analysisToStock(a, market, candidates)} />
                </button>
              ))}
            </div>
          </Card>
        </section>
      )}

      {open && (
        <Card>
          <SectionHead
            eyebrow={`#${open.code}`}
            title={open.name}
            jp={`総合スコア ${open.totalScore}`}
            right={<UpDown value={0} />}
          />

          {/* Scores */}
          <div className="mt-6 grid grid-cols-5 gap-4">
            {[
              { k: "勢い", v: open.scores.a },
              { k: "需給", v: open.scores.b },
              { k: "材料", v: open.scores.c },
              { k: "ファンダ", v: open.scores.d },
              { k: "リスク", v: open.scores.e },
            ].map((s) => (
              <div key={s.k} className="flex flex-col gap-1">
                <p className="text-ink-mute" style={{ fontSize: 10, letterSpacing: "0.1em" }}>{s.k}</p>
                <p className="font-mono text-ink" style={{ fontSize: 18, fontWeight: 600 }}>{s.v}</p>
                <div style={{ height: 4, background: "var(--bg-2)", borderRadius: 2 }}>
                  <div style={{ width: `${s.v}%`, height: "100%", background: "var(--coral)", borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Scenarios */}
          <div className="mt-8 flex flex-col gap-2">
            <p className="text-ink-mute" style={{ fontSize: 11, letterSpacing: "0.1em" }}>シナリオ</p>
            {scenarios(open).map((s) => (
              <ScenarioRow key={s.horizon} row={s} />
            ))}
          </div>

          {/* Catalysts / Risks */}
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-ink-mute" style={{ fontSize: 11, letterSpacing: "0.1em" }}>カタリスト</p>
              <ul className="mt-2 list-disc pl-5 text-ink-soft" style={{ fontSize: 13, lineHeight: 1.7 }}>
                {open.catalysts.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
            <div>
              <p className="text-ink-mute" style={{ fontSize: 11, letterSpacing: "0.1em" }}>リスク</p>
              <ul className="mt-2 list-disc pl-5 text-ink-soft" style={{ fontSize: 13, lineHeight: 1.7 }}>
                {open.risks.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <ChatPanel
        title="AI チャットで深掘り"
        context={{
          market: market === "US" ? "US" : market === "JP" ? "JP" : "JP/US",
          tickers: analyses.map((a) => a.code).slice(0, 10),
          sector: theme || undefined,
        }}
        showWebSearchToggle={showWebSearchToggle}
      />
    </main>
  );
}

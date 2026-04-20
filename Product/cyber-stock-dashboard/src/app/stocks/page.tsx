"use client";

import * as React from "react";
import { Card, Chip, Icon, SectionHead, Stat } from "@/components/ember/ui";
import { PriceChart, RadarChart, type Candle } from "@/components/ember/charts";
import {
  RankRow,
  type StockSummary,
} from "@/components/ember/composites";
import type { StockAnalysis } from "@/lib/llm/schemas";

const UNIVERSE: StockSummary[] = [
  { id: "7203", ticker: "7203.T", name: "トヨタ自動車", sector: "自動車", price: 2950, change: 18, changePct: 0.62, currency: "JPY", totalScore: 78 },
  { id: "9984", ticker: "9984.T", name: "ソフトバンクG", sector: "情報通信", price: 9100, change: -45, changePct: -0.49, currency: "JPY", totalScore: 72 },
  { id: "AAPL", ticker: "AAPL", name: "Apple", sector: "情報技術", price: 232.4, change: 1.8, changePct: 0.78, currency: "USD", totalScore: 85 },
  { id: "NVDA", ticker: "NVDA", name: "NVIDIA", sector: "情報技術", price: 142.7, change: 3.5, changePct: 2.51, currency: "USD", totalScore: 92 },
  { id: "8316", ticker: "8316.T", name: "三井住友FG", sector: "金融", price: 3850, change: 22, changePct: 0.57, currency: "JPY", totalScore: 75 },
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
    out.push({ t: today - (days - 1 - i) * DAY_MS, o: open, h: high, l: low, c: close, v: 0 });
    v = close;
  }
  return out;
}

const PERIODS = [{ id: "1M", days: 30 }, { id: "3M", days: 90 }, { id: "6M", days: 180 }, { id: "1Y", days: 365 }];
const RADAR_AXES = ["値動き余地", "出来高需給", "材料テーマ", "ファンダ", "リスク耐性"];

function radarFromAnalysis(a: StockAnalysis): import("@/components/ember/charts").ScoreShape {
  return {
    momentum: a.scores.a,
    value: a.scores.d,
    quality: a.scores.e,
    growth: a.scores.c,
    sentiment: a.scores.b,
  };
}

function radarForStock(stock: StockSummary): import("@/components/ember/charts").ScoreShape {
  const h = stock.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const base = stock.totalScore ?? 60;
  const v = (i: number) => Math.max(20, Math.min(95, base - 20 + ((h * (i + 1)) % 40)));
  return { momentum: v(0), value: v(1), quality: v(2), growth: v(3), sentiment: v(4) };
}

// -------------------- Research Panel --------------------

interface ResearchState {
  status: "idle" | "loading" | "done" | "error";
  analysis: StockAnalysis | null;
  error: string | null;
}

function ScenarioCell({ leg }: { leg: { up: string; mid: string; down: string; confidence: string; evidence: string } }) {
  return (
    <div className="flex flex-col gap-1.5 text-xs" style={{ fontSize: 11 }}>
      <span style={{ color: "var(--up)" }}>▲ {leg.up}</span>
      <span style={{ color: "var(--ink-soft)" }}>━ {leg.mid}</span>
      <span style={{ color: "var(--down)" }}>▼ {leg.down}</span>
      <div className="flex gap-1 mt-0.5">
        <Chip tone={leg.confidence === "high" ? "sage" : leg.confidence === "mid" ? "clay" : "coral"}>
          確度:{leg.confidence}
        </Chip>
        <Chip tone="clay">根拠:{leg.evidence}</Chip>
      </div>
    </div>
  );
}

function ResearchPanel({ analysis }: { analysis: StockAnalysis }) {
  const radar = radarFromAnalysis(analysis);
  const signalTone = analysis.totalScore >= 80 ? "sage" : analysis.totalScore >= 60 ? "clay" : "coral";
  const signalLabel = analysis.totalScore >= 80 ? "強気" : analysis.totalScore >= 60 ? "中立" : "弱気";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-baseline gap-3">
        <h3 className="text-ink font-serif" style={{ fontSize: 22 }}>
          {analysis.name} <span className="text-ink-mute font-mono" style={{ fontSize: 14 }}>({analysis.code})</span>
        </h3>
        <Chip tone={signalTone}>{signalLabel}</Chip>
        <span className="font-mono text-ink-soft" style={{ fontSize: 13 }}>総合 {analysis.totalScore}pt</span>
      </div>

      {/* Scores + Radar */}
      <div className="grid gap-6 md:grid-cols-[1fr_240px]">
        <div className="grid grid-cols-5 gap-2">
          {(["a", "b", "c", "d", "e"] as const).map((k, i) => (
            <Card key={k}>
              <p className="text-ink-mute" style={{ fontSize: 10 }}>{RADAR_AXES[i]}</p>
              <p className="font-mono text-ink mt-1" style={{ fontSize: 22, fontWeight: 700 }}>{analysis.scores[k]}</p>
            </Card>
          ))}
        </div>
        <div className="flex justify-center">
          <RadarChart scores={radar} axisLabels={RADAR_AXES} size={220} />
        </div>
      </div>

      {/* Scenarios */}
      <Card padded={false}>
        <div className="p-4 pb-2">
          <SectionHead eyebrow="SCENARIO" title="短中長期シナリオ" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x px-4 pb-4" style={{ borderColor: "var(--border)" }}>
          {(["short", "mid", "long"] as const).map((horizon) => (
            <div key={horizon} className="px-3 py-3 md:py-0 first:pl-0 last:pr-0 first:pt-0 last:pb-0">
              <p className="text-ink-mute mb-2" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
                {horizon === "short" ? "短期 (〜3M)" : horizon === "mid" ? "中期 (3〜12M)" : "長期 (1〜3Y)"}
              </p>
              <ScenarioCell leg={analysis.scenarios[horizon]} />
            </div>
          ))}
        </div>
      </Card>

      {/* Risks / Catalysts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <SectionHead eyebrow="RISK" title="リスク要因" />
          <ul className="mt-3 flex flex-col gap-1.5">
            {analysis.risks.map((r, i) => (
              <li key={i} className="flex gap-2 items-start" style={{ fontSize: 12 }}>
                <span style={{ color: "var(--down)" }}>▼</span>
                <span className="text-ink">{r}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <SectionHead eyebrow="CATALYST" title="カタリスト" />
          <ul className="mt-3 flex flex-col gap-1.5">
            {analysis.catalysts.map((c, i) => (
              <li key={i} className="flex gap-2 items-start" style={{ fontSize: 12 }}>
                <span style={{ color: "var(--up)" }}>▲</span>
                <span className="text-ink">{c}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {analysis.unknowns.length > 0 && (
        <Card>
          <SectionHead eyebrow="UNKNOWN" title="不確定要素" />
          <ul className="mt-3 flex flex-wrap gap-2">
            {analysis.unknowns.map((u, i) => (
              <li key={i}>
                <Chip tone="clay">{u}</Chip>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-ink-mute" style={{ fontSize: 10 }}>
        ※ LLM 推論による参考情報。売買推奨ではありません。最終判断はご自身でお願いします。
      </p>
    </div>
  );
}

// -------------------- Main Page --------------------

export default function StocksPage() {
  const [selectedId, setSelectedId] = React.useState<string>(UNIVERSE[0].id);
  const [period, setPeriod] = React.useState<string>("3M");
  const [mode, setMode] = React.useState<"line" | "area" | "candle">("area");

  // Research state
  const [searchCode, setSearchCode] = React.useState("");
  const [searchMarket, setSearchMarket] = React.useState<"JP" | "US">("JP");
  const [research, setResearch] = React.useState<ResearchState>({ status: "idle", analysis: null, error: null });
  const researchPanelRef = React.useRef<HTMLDivElement>(null);

  const stock = UNIVERSE.find((s) => s.id === selectedId) ?? UNIVERSE[0];
  const days = PERIODS.find((p) => p.id === period)?.days ?? 90;
  const candles = React.useMemo(
    () => syntheticCandles(stock.id.charCodeAt(0), days, stock.price),
    [stock, days],
  );

  const runResearch = async (codeOverride?: string, marketOverride?: "JP" | "US") => {
    const code = (codeOverride ?? searchCode).trim();
    const market = marketOverride ?? searchMarket;
    if (!code) return;
    setResearch({ status: "loading", analysis: null, error: null });
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, market }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "analyze failed");
      setResearch({ status: "done", analysis: j.data as StockAnalysis, error: null });
      
      // C2: 自動スクロール (prefers-reduced-motion 検知)
      setTimeout(() => {
        if (researchPanelRef.current) {
          const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          researchPanelRef.current.scrollIntoView({
            behavior: prefersReduced ? "auto" : "smooth",
            block: "start",
          });
        }
      }, 100);
    } catch (e) {
      setResearch({ status: "error", analysis: null, error: e instanceof Error ? e.message : "エラーが発生しました" });
    }
  };

  // Auto-trigger research from URL params (?code=XXX&market=JP|US)
  const autoResearchRan = React.useRef(false);
  React.useEffect(() => {
    if (autoResearchRan.current) return;
    autoResearchRan.current = true;
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get("code");
    if (codeParam) {
      const marketParam = params.get("market");
      const market: "JP" | "US" = marketParam === "US" ? "US" : "JP";
      queueMicrotask(() => {
        setSearchCode(codeParam);
        setSearchMarket(market);
        runResearch(codeParam, market);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const inputCls = "rounded-md border border-border bg-bg-2 px-3 py-2 text-sm text-ink outline-none focus:border-[color:var(--coral)]";

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <SectionHead
        eyebrow="STOCKS"
        title="個別銘柄リサーチ"
        jp="銘柄コードを入力してAI分析を実行"
      />

      {/* Research input */}
      <Card>
        <SectionHead eyebrow="RESEARCH" title="銘柄リサーチ実行" jp="コードを入力してAIが5軸分析" />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runResearch();
          }}
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <label className="flex flex-col gap-1 text-ink-soft" style={{ fontSize: 12 }}>
            銘柄コード
            <input
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="例: 7203 / NVDA / SPY"
              className={inputCls}
              style={{ width: 200 }}
            />
          </label>
          <label className="flex flex-col gap-1 text-ink-soft" style={{ fontSize: 12 }}>
            市場
            <select
              value={searchMarket}
              onChange={(e) => setSearchMarket(e.target.value as "JP" | "US")}
              className={inputCls}
              style={{ width: 100 }}
            >
              <option value="JP">JP（日本株）</option>
              <option value="US">US（米国株）</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={research.status === "loading" || !searchCode.trim()}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-white"
            style={{
              background: "var(--coral)",
              fontSize: 13,
              fontWeight: 600,
              opacity: research.status === "loading" || !searchCode.trim() ? 0.6 : 1,
            }}
          >
            <Icon name={research.status === "loading" ? "spinner" : "search"} size={13} />
            {research.status === "loading" ? "分析中…" : "リサーチ実行"}
          </button>
        </form>
        {research.status === "loading" && (
          <p className="mt-3 text-ink-soft" style={{ fontSize: 12 }}>
            AIが5軸スコアリングと短中長期シナリオを生成中です。しばらくお待ちください…
          </p>
        )}
        {research.status === "error" && (
          <p className="mt-3 inline-flex items-center gap-1.5" style={{ color: "var(--down)", fontSize: 12 }}>
            <Icon name="alert" size={12} />
            {research.error}
          </p>
        )}
      </Card>

      {/* Research result */}
      {research.status === "done" && research.analysis && (
        <div ref={researchPanelRef}>
          <Card>
            <div className="flex items-center gap-3 flex-wrap">
              <SectionHead eyebrow="ANALYSIS RESULT" title="AI分析結果" />
              <div className="flex gap-2 ml-auto">
                <a
                  href={`/portfolio?add=${encodeURIComponent(research.analysis.code)}&market=${searchMarket}&name=${encodeURIComponent(research.analysis.name)}`}
                  className="rounded-full px-3 py-1 text-white"
                  style={{ background: "var(--coral)", fontSize: 11, fontWeight: 600 }}
                >
                  + ポートフォリオに追加
                </a>
              </div>
            </div>
            <div className="mt-4">
              <ResearchPanel analysis={research.analysis} />
            </div>
          </Card>
        </div>
      )}

      {/* Divider */}
      <div className="border-t" style={{ borderColor: "var(--border)" }} />

      {/* Universe pills */}
      <SectionHead eyebrow="WATCHLIST" title="クイック参照銘柄" jp="サンプルデータ（合成価格）" />
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
              color: s.id === selectedId ? "var(--surface)" : "var(--ink-soft)",
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
                  <button key={m} type="button" onClick={() => setMode(m)} className="rounded-full px-3 py-1"
                    style={{ fontSize: 11, background: mode === m ? "var(--coral)" : "var(--bg-2)", color: mode === m ? "#fff" : "var(--ink-soft)", border: "1px solid var(--border)" }}>
                    {m}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {PERIODS.map((p) => (
                  <button key={p.id} type="button" onClick={() => setPeriod(p.id)} className="rounded-full px-3 py-1"
                    style={{ fontSize: 11, background: period === p.id ? "var(--coral)" : "var(--bg-2)", color: period === p.id ? "#fff" : "var(--ink-soft)", border: "1px solid var(--border)" }}>
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
          <SectionHead eyebrow="SCORE" title="5軸スコア（サンプル）" jp="リサーチ実行でAIスコアに更新" />
          <div className="mt-4 flex justify-center">
            <RadarChart scores={radarForStock(stock)} axisLabels={RADAR_AXES} size={260} interactive />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            <Card><Stat label="セクター" value={stock.sector} /></Card>
            <Card><Stat label="通貨" value={stock.currency} mono /></Card>
            <Card><Stat label="スコア" value={stock.totalScore ?? "—"} mono /></Card>
            <Card>
              <Stat label="シグナル" value={
                <Chip tone={(stock.totalScore ?? 0) >= 80 ? "sage" : (stock.totalScore ?? 0) >= 60 ? "clay" : "coral"}>
                  {(stock.totalScore ?? 0) >= 80 ? "強気" : (stock.totalScore ?? 0) >= 60 ? "中立" : "弱気"}
                </Chip>
              } />
            </Card>
          </div>
        </Card>
      </section>

      {/* Related */}
      <section>
        <SectionHead eyebrow="RELATED" title="同セクター候補" />
        <Card padded={false}>
          <div className="px-6 py-2 flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
            {UNIVERSE.filter((s) => s.id !== stock.id).slice(0, 4).map((s, i) => (
              <button key={s.id} type="button" onClick={() => setSelectedId(s.id)} className="text-left py-3 hover:bg-bg-2">
                <RankRow rank={i + 1} stock={s} />
              </button>
            ))}
          </div>
        </Card>
      </section>
    </main>
  );
}

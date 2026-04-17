"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AnimatePresence, motion } from "@/components/ui/MotionPrimitives";
import {
  runBacktest,
  type BacktestConfig,
  type BacktestResult,
  type StrategyKind,
} from "@/lib/backtest/engine";
import { generateSampleCandles } from "@/lib/backtest/sampleCandles";
import { useBacktestStore, type StoredBacktestResult } from "@/store/useBacktestStore";

// ── Strategy param configs ────────────────────────────────────────────────

const STRATEGY_PARAMS: Record<StrategyKind, Array<{ key: string; label: string; default: number }>> = {
  sma_cross: [
    { key: "fast", label: "Fast 期間", default: 5 },
    { key: "slow", label: "Slow 期間", default: 20 },
  ],
  rsi_reversion: [
    { key: "period", label: "RSI 期間", default: 14 },
    { key: "oversold", label: "過売り閾値", default: 30 },
    { key: "overbought", label: "過買い閾値", default: 70 },
  ],
  buy_and_hold: [],
};

// ── Interpret API client ──────────────────────────────────────────────────

interface InterpretResponse {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  improvementIdeas: string[];
  riskNotes: string[];
  model?: string;
  cached?: boolean;
  error?: string;
}

async function fetchInterpret(result: BacktestResult): Promise<InterpretResponse> {
  const body = {
    initialCapital: result.config.initialCapital,
    strategy: result.config.strategy,
    metrics: {
      total: result.metrics.totalReturnPct,
      sharpe: result.metrics.sharpe,
      dd: result.metrics.maxDrawdownPct,
      winRate: result.metrics.winRate,
    },
    notableTrades: result.trades.slice(0, 5).map((t) => ({
      entry: t.entryPrice,
      exit: t.exitPrice,
      pnlPct: t.pnlPct,
    })),
  };
  const res = await fetch("/api/deep/backtest-interpret", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as InterpretResponse;
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

// ── Component ────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);
const ONE_YEAR_AGO = new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10);

export default function BacktestPage(): JSX.Element {
  const { history, saveResult, removeResult } = useBacktestStore();

  const [strategy, setStrategy] = useState<StrategyKind>("sma_cross");
  const [fromDate, setFromDate] = useState(ONE_YEAR_AGO);
  const [toDate, setToDate] = useState(TODAY);
  const [initialCapital, setInitialCapital] = useState(1_000_000);
  const [feePct, setFeePct] = useState(0.001);
  const [slippagePct, setSlippagePct] = useState(0.0005);
  const [params, setParams] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const p of STRATEGY_PARAMS.sma_cross) init[p.key] = p.default;
    return init;
  });

  const [activeResult, setActiveResult] = useState<StoredBacktestResult | null>(null);
  const [interpret, setInterpret] = useState<InterpretResponse | null>(null);
  const [interpretLoading, setInterpretLoading] = useState(false);
  const [interpretError, setInterpretError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function switchStrategy(next: StrategyKind): void {
    setStrategy(next);
    const init: Record<string, number> = {};
    for (const p of STRATEGY_PARAMS[next]) init[p.key] = p.default;
    setParams(init);
  }

  function runWithSample(): void {
    const candles = generateSampleCandles(fromDate, toDate, 42);
    const config: BacktestConfig = {
      initialCapital,
      feePct,
      slippagePct,
      strategy,
      params,
    };
    const result = runBacktest(candles, config);
    const stored = saveResult(result, `${strategy} ${fromDate}〜${toDate}`);
    setActiveResult(stored);
    setInterpret(null);
    setInterpretError(null);
  }

  const runSampleRef = useRef(runWithSample);
  runSampleRef.current = runWithSample;
  useEffect(() => {
    const handler = (): void => runSampleRef.current();
    window.addEventListener("backtest:run-sample", handler);
    return () => window.removeEventListener("backtest:run-sample", handler);
  }, []);

  async function askAi(): Promise<void> {
    if (!activeResult) return;
    setInterpretLoading(true);
    setInterpretError(null);
    setDrawerOpen(true);
    try {
      const r = await fetchInterpret(activeResult);
      setInterpret(r);
    } catch (err) {
      setInterpretError(err instanceof Error ? err.message : "AI 解釈に失敗しました");
    } finally {
      setInterpretLoading(false);
    }
  }

  const equityData = useMemo(
    () =>
      activeResult?.equity.map((p) => ({
        t: new Date(p.t * 1000).toISOString().slice(0, 10),
        value: Math.round(p.value),
      })) ?? [],
    [activeResult],
  );

  const metrics = activeResult?.metrics;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 text-slate-100">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">バックテスト</h1>
        <p className="text-sm text-slate-400">
          戦略シミュレーションを実行し、メトリクスと AI 解釈を確認します。
        </p>
      </header>

      {/* Input panel */}
      <section className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          戦略
          <select
            aria-label="strategy"
            className="inp-glass rounded-md bg-slate-800 px-2 py-1"
            value={strategy}
            onChange={(e) => switchStrategy(e.target.value as StrategyKind)}
          >
            <option value="sma_cross">SMA クロス</option>
            <option value="rsi_reversion">RSI 逆張り</option>
            <option value="buy_and_hold">Buy &amp; Hold</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          初期資金
          <input
            type="number"
            aria-label="initialCapital"
            className="inp-glass rounded-md bg-slate-800 px-2 py-1"
            value={initialCapital}
            onChange={(e) => setInitialCapital(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          期間 (from)
          <input
            type="date"
            aria-label="from"
            className="inp-glass rounded-md bg-slate-800 px-2 py-1"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          期間 (to)
          <input
            type="date"
            aria-label="to"
            className="inp-glass rounded-md bg-slate-800 px-2 py-1"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          手数料 (往復, 小数)
          <input
            type="number"
            step="0.0001"
            aria-label="fee"
            className="inp-glass rounded-md bg-slate-800 px-2 py-1"
            value={feePct}
            onChange={(e) => setFeePct(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          スリッページ (小数)
          <input
            type="number"
            step="0.0001"
            aria-label="slippage"
            className="inp-glass rounded-md bg-slate-800 px-2 py-1"
            value={slippagePct}
            onChange={(e) => setSlippagePct(Number(e.target.value))}
          />
        </label>

        {/* Dynamic strategy params */}
        <div className="grid gap-3 md:col-span-2 md:grid-cols-3" data-testid="strategy-params">
          {STRATEGY_PARAMS[strategy].map((p) => (
            <label key={p.key} className="flex flex-col gap-1 text-xs text-slate-300">
              {p.label}
              <input
                type="number"
                aria-label={`param-${p.key}`}
                className="inp-glass rounded-md bg-slate-800 px-2 py-1"
                value={params[p.key] ?? p.default}
                onChange={(e) =>
                  setParams((prev) => ({ ...prev, [p.key]: Number(e.target.value) }))
                }
              />
            </label>
          ))}
        </div>

        <div className="flex gap-2 md:col-span-2">
          <button
            type="button"
            className="rounded-md border border-cyan-500 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 inp-neon-ring"
            onClick={runWithSample}
          >
            サンプルデータで実行
          </button>
          <button
            type="button"
            className="rounded-md border border-purple-500 bg-purple-500/20 px-4 py-2 text-sm font-semibold text-purple-100"
            onClick={askAi}
            disabled={!activeResult || interpretLoading}
          >
            AI 解釈 (Deep)
          </button>
        </div>
      </section>

      {/* KPI cards */}
      {metrics && (
        <section
          className="grid grid-cols-2 gap-3 md:grid-cols-5"
          data-testid="backtest-kpi"
        >
          <KpiCard label="Total Return" value={`${metrics.totalReturnPct.toFixed(2)}%`} />
          <KpiCard label="Sharpe" value={metrics.sharpe.toFixed(2)} />
          <KpiCard label="Max DD" value={`${metrics.maxDrawdownPct.toFixed(2)}%`} />
          <KpiCard label="Win Rate" value={`${metrics.winRate.toFixed(1)}%`} />
          <KpiCard label="Trades" value={String(metrics.tradeCount)} />
        </section>
      )}

      {/* Equity curve */}
      {activeResult && (
        <section
          className="h-64 rounded-xl border border-slate-800 bg-slate-900/60 p-3"
          data-testid="backtest-equity-chart"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={equityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="t" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} domain={["auto", "auto"]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Trade table */}
      {activeResult && activeResult.trades.length > 0 && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <h2 className="mb-2 text-sm font-semibold">トレード一覧</h2>
          <table className="w-full text-xs" data-testid="backtest-trades">
            <thead className="text-slate-400">
              <tr>
                <th className="py-1 text-left">Entry</th>
                <th className="py-1 text-left">Exit</th>
                <th className="py-1 text-right">Qty</th>
                <th className="py-1 text-right">PnL</th>
                <th className="py-1 text-right">PnL%</th>
              </tr>
            </thead>
            <tbody>
              {activeResult.trades.map((t, idx) => (
                <tr key={`${t.entryT}-${idx}`} data-testid="backtest-trade-row">
                  <td>{new Date(t.entryT * 1000).toISOString().slice(0, 10)}</td>
                  <td>{new Date(t.exitT * 1000).toISOString().slice(0, 10)}</td>
                  <td className="text-right">{t.qty.toFixed(4)}</td>
                  <td
                    className={`text-right ${t.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {t.pnl.toFixed(2)}
                  </td>
                  <td
                    className={`text-right ${t.pnlPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {t.pnlPct.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* History */}
      {history.length > 0 && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <h2 className="mb-2 text-sm font-semibold">履歴 (最新 5 件)</h2>
          <ul className="space-y-2 text-xs">
            {history.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-md border border-slate-800 px-2 py-1"
              >
                <button
                  type="button"
                  className="text-left text-slate-200 hover:text-cyan-300"
                  onClick={() => setActiveResult(item)}
                >
                  <span className="font-semibold">{item.label ?? item.config.strategy}</span>
                  <span className="ml-2 text-slate-500">
                    Return {item.metrics.totalReturnPct.toFixed(2)}% / Sharpe{" "}
                    {item.metrics.sharpe.toFixed(2)}
                  </span>
                </button>
                <button
                  type="button"
                  className="text-slate-500 hover:text-rose-400"
                  onClick={() => removeResult(item.id)}
                  aria-label={`remove-${item.id}`}
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* AI drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.aside
            key="ai-drawer"
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed right-0 top-0 z-50 h-full w-[min(420px,90vw)] overflow-y-auto border-l border-slate-800 bg-slate-950/95 p-4"
            data-testid="ai-drawer"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">AI 解釈</h3>
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-white"
                onClick={() => setDrawerOpen(false)}
              >
                閉じる
              </button>
            </div>
            {interpretLoading && <p className="text-xs text-slate-400">解析中…</p>}
            {interpretError && (
              <p className="text-xs text-rose-400">エラー: {interpretError}</p>
            )}
            {interpret && (
              <div className="space-y-3 text-xs text-slate-200">
                <p className="rounded-md bg-slate-800/60 p-2" data-testid="ai-summary">
                  {interpret.summary}
                </p>
                <InterpretList title="強み" items={interpret.strengths} />
                <InterpretList title="弱み" items={interpret.weaknesses} />
                <InterpretList title="改善アイデア" items={interpret.improvementIdeas} />
                <InterpretList title="リスクノート" items={interpret.riskNotes} />
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </main>
  );
}

function KpiCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-100">{value}</p>
    </div>
  );
}

function InterpretList({ title, items }: { title: string; items: string[] }): JSX.Element | null {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">{title}</p>
      <ul className="list-disc space-y-1 pl-4">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

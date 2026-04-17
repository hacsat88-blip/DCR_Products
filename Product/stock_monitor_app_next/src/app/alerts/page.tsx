"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { evaluateRule } from "@/lib/alerts/evaluate";
import {
  useAlertsStore,
  type AlertChannel,
  type AlertField,
  type AlertMarket,
  type AlertOp,
  type AlertRuleInput,
} from "@/store/useAlertsStore";

const CHANNELS: AlertChannel[] = ["discord", "line", "email"];
const OPS: AlertOp[] = [">=", "<=", "cross_up", "cross_down"];

interface FormState {
  symbol: string;
  market: AlertMarket;
  op: AlertOp;
  target: string;
  field: AlertField;
  notifyChannels: AlertChannel[];
}

const INITIAL_FORM: FormState = {
  symbol: "",
  market: "JP",
  op: ">=",
  target: "",
  field: "price",
  notifyChannels: ["discord"],
};

export default function AlertsPage(): JSX.Element {
  const { rules, add, remove, setEnabled } = useAlertsStore();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);

  // Demo evaluation inputs
  const [demoPrice, setDemoPrice] = useState("");
  const [demoPrev, setDemoPrev] = useState("");
  const [demoResult, setDemoResult] = useState<string | null>(null);

  const sortedByLatest = useMemo(() => {
    return [...rules]
      .sort((a, b) => (b.lastTriggeredAt ?? "").localeCompare(a.lastTriggeredAt ?? ""))
      .slice(0, 10);
  }, [rules]);

  function submit(): void {
    setError(null);
    if (!form.symbol.trim()) {
      setError("銘柄コードを入力してください");
      return;
    }
    const target = Number(form.target);
    if (!Number.isFinite(target)) {
      setError("target は数値で入力してください");
      return;
    }
    if (form.notifyChannels.length === 0) {
      setError("通知先を 1 つ以上選択してください");
      return;
    }
    const input: AlertRuleInput = {
      symbol: form.symbol.trim(),
      market: form.market,
      condition: { op: form.op, target, field: form.field },
      notifyChannels: form.notifyChannels,
      enabled: true,
    };
    add(input);
    setForm(INITIAL_FORM);
  }

  function toggleChannel(ch: AlertChannel): void {
    setForm((prev) => ({
      ...prev,
      notifyChannels: prev.notifyChannels.includes(ch)
        ? prev.notifyChannels.filter((c) => c !== ch)
        : [...prev.notifyChannels, ch],
    }));
  }

  function runDemo(): void {
    const price = Number(demoPrice);
    if (!Number.isFinite(price)) {
      setDemoResult("price が不正です");
      return;
    }
    const prevPrice = demoPrev === "" ? undefined : Number(demoPrev);
    if (rules.length === 0) {
      setDemoResult("評価対象のルールがありません");
      return;
    }
    const results = rules.map((r) => {
      const e = evaluateRule(r, { price, prevPrice });
      return `${r.symbol} ${r.condition.op} ${r.condition.target}: ${e.triggered ? "TRIGGERED" : "-"}${e.reason ? ` (${e.reason})` : ""}`;
    });
    setDemoResult(results.join(" / "));
  }

  const evaluateNowRef = useRef(runDemo);
  evaluateNowRef.current = runDemo;
  useEffect(() => {
    const handler = (): void => evaluateNowRef.current();
    window.addEventListener("alerts:evaluate-now", handler);
    return () => window.removeEventListener("alerts:evaluate-now", handler);
  }, []);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 text-slate-100">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">アラート</h1>
        <p className="text-sm text-slate-400">価格・変化率ベースの通知ルールを管理します。</p>
      </header>

      {/* Form */}
      <section className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          銘柄
          <input
            aria-label="symbol"
            className="inp-glass rounded-md bg-slate-800 px-2 py-1"
            value={form.symbol}
            onChange={(e) => setForm((p) => ({ ...p, symbol: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          市場
          <select
            aria-label="market"
            className="inp-glass rounded-md bg-slate-800 px-2 py-1"
            value={form.market}
            onChange={(e) => setForm((p) => ({ ...p, market: e.target.value as AlertMarket }))}
          >
            <option value="JP">JP</option>
            <option value="US">US</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          条件
          <select
            aria-label="op"
            className="inp-glass rounded-md bg-slate-800 px-2 py-1"
            value={form.op}
            onChange={(e) => setForm((p) => ({ ...p, op: e.target.value as AlertOp }))}
          >
            {OPS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          target
          <input
            aria-label="target"
            type="number"
            className="inp-glass rounded-md bg-slate-800 px-2 py-1"
            value={form.target}
            onChange={(e) => setForm((p) => ({ ...p, target: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          field
          <select
            aria-label="field"
            className="inp-glass rounded-md bg-slate-800 px-2 py-1"
            value={form.field}
            onChange={(e) => setForm((p) => ({ ...p, field: e.target.value as AlertField }))}
          >
            <option value="price">price</option>
            <option value="changePct">changePct</option>
          </select>
        </label>
        <div className="flex flex-col gap-1 text-xs text-slate-300">
          通知先
          <div className="flex gap-3">
            {CHANNELS.map((ch) => (
              <label key={ch} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  aria-label={`channel-${ch}`}
                  checked={form.notifyChannels.includes(ch)}
                  onChange={() => toggleChannel(ch)}
                />
                {ch}
              </label>
            ))}
          </div>
        </div>
        <div className="md:col-span-3">
          {error && <p className="mb-2 text-xs text-rose-400">{error}</p>}
          <button
            type="button"
            className="rounded-md border border-cyan-500 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100"
            onClick={submit}
          >
            ルール追加
          </button>
        </div>
      </section>

      {/* Rules list */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-sm font-semibold">ルール一覧</h2>
        {rules.length === 0 ? (
          <p className="text-xs text-slate-400">ルールはまだありません。</p>
        ) : (
          <ul className="space-y-2 text-xs" data-testid="rules-list">
            {rules.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-md border border-slate-800 p-2"
                data-testid="rule-row"
              >
                <div>
                  <span className="font-semibold">
                    {r.symbol} ({r.market})
                  </span>{" "}
                  <span className="text-slate-400">
                    {r.condition.field} {r.condition.op} {r.condition.target}
                  </span>
                  <span className="ml-2 text-[10px] text-slate-500">
                    通知: {r.notifyChannels.join(",")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      aria-label={`enabled-${r.id}`}
                      checked={r.enabled}
                      onChange={(e) => setEnabled(r.id, e.target.checked)}
                    />
                    ON
                  </label>
                  <button
                    type="button"
                    className="text-rose-400 hover:text-rose-300"
                    onClick={() => remove(r.id)}
                    aria-label={`remove-${r.id}`}
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Latest triggered */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-sm font-semibold">最新トリガー (最大 10)</h2>
        <ul className="space-y-1 text-xs text-slate-300">
          {sortedByLatest
            .filter((r) => r.lastTriggeredAt)
            .map((r) => (
              <li key={r.id}>
                {r.symbol}: {r.lastTriggeredAt}
              </li>
            ))}
          {sortedByLatest.filter((r) => r.lastTriggeredAt).length === 0 && (
            <li className="text-slate-500">まだトリガー履歴はありません。</li>
          )}
        </ul>
      </section>

      {/* Demo evaluation */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-sm font-semibold">今すぐ評価 (デモ)</h2>
        <div className="grid gap-2 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            price
            <input
              aria-label="demo-price"
              type="number"
              className="inp-glass rounded-md bg-slate-800 px-2 py-1"
              value={demoPrice}
              onChange={(e) => setDemoPrice(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            prevPrice
            <input
              aria-label="demo-prev"
              type="number"
              className="inp-glass rounded-md bg-slate-800 px-2 py-1"
              value={demoPrev}
              onChange={(e) => setDemoPrev(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="self-end rounded-md border border-emerald-500 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-100"
            onClick={runDemo}
          >
            評価実行
          </button>
        </div>
        {demoResult && (
          <p className="mt-2 text-xs text-slate-200" data-testid="demo-result">
            {demoResult}
          </p>
        )}
      </section>
    </main>
  );
}

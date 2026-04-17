"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { motion, fadeUpVariants } from "@/components/ui/MotionPrimitives";
import {
  useHoldingsStore,
  type Holding,
  type HoldingMarket,
} from "@/store/useHoldingsStore";

// NOTE: 現在価格連携は Phase 5 で実装予定。暫定として averageCost を現在価格として扱う。

const SECTOR_COLORS = [
  "#38bdf8",
  "#a78bfa",
  "#f472b6",
  "#facc15",
  "#34d399",
  "#fb923c",
  "#60a5fa",
];

const MARKET_COLORS: Record<HoldingMarket, string> = {
  JP: "#f472b6",
  US: "#38bdf8",
};

function formatCurrency(value: number, market: HoldingMarket = "JP"): string {
  const currency = market === "US" ? "USD" : "JPY";
  try {
    return new Intl.NumberFormat(market === "US" ? "en-US" : "ja-JP", {
      style: "currency",
      currency,
      maximumFractionDigits: market === "US" ? 2 : 0,
    }).format(value);
  } catch {
    return `${value.toLocaleString()}`;
  }
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString("ja-JP") : "—";
}

function computeHoldingCost(h: Holding): number {
  return h.quantity * h.averageCost;
}

interface FormState {
  symbol: string;
  name: string;
  market: HoldingMarket;
  quantity: string;
  averageCost: string;
  acquiredAt: string;
  sector: string;
  note: string;
}

const INITIAL_FORM: FormState = {
  symbol: "",
  name: "",
  market: "JP",
  quantity: "",
  averageCost: "",
  acquiredAt: new Date().toISOString().slice(0, 10),
  sector: "",
  note: "",
};

function validateForm(form: FormState): string | null {
  if (!form.symbol.trim()) return "symbol は必須です";
  const q = Number(form.quantity);
  if (!Number.isFinite(q) || q <= 0) return "quantity は 0 より大きい数値を指定してください";
  const c = Number(form.averageCost);
  if (!Number.isFinite(c) || c < 0) return "averageCost は 0 以上の数値を指定してください";
  if (!form.acquiredAt) return "acquiredAt は必須です";
  return null;
}

export default function PortfolioPage(): JSX.Element {
  const holdings = useHoldingsStore((s) => s.holdings);
  const addHolding = useHoldingsStore((s) => s.addHolding);
  const updateHolding = useHoldingsStore((s) => s.updateHolding);
  const removeHolding = useHoldingsStore((s) => s.removeHolding);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (): void => {
      const el = document.querySelector<HTMLInputElement>(
        'input[aria-label="銘柄コード"]',
      );
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    };
    window.addEventListener("portfolio:open-add", handler);
    return () => window.removeEventListener("portfolio:open-add", handler);
  }, []);

  const totalCost = useMemo(
    () => holdings.reduce((acc, h) => acc + computeHoldingCost(h), 0),
    [holdings],
  );

  // 現在価格は未取得 → 評価額は "—"、含み損益も算出不可。
  const currentValue: number | null = null;
  const pnl: number | null = currentValue === null ? null : currentValue - totalCost;
  const pnlRate: number | null =
    pnl === null || totalCost === 0 ? null : (pnl / totalCost) * 100;

  const bySector = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of holdings) {
      const key = h.sector?.trim() || "未分類";
      map.set(key, (map.get(key) ?? 0) + computeHoldingCost(h));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [holdings]);

  const byMarket = useMemo(() => {
    const map = new Map<HoldingMarket, number>();
    for (const h of holdings) {
      map.set(h.market, (map.get(h.market) ?? 0) + computeHoldingCost(h));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [holdings]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const msg = validateForm(form);
    if (msg) {
      setError(msg);
      return;
    }
    addHolding({
      symbol: form.symbol.trim(),
      name: form.name.trim() || undefined,
      market: form.market,
      quantity: Number(form.quantity),
      averageCost: Number(form.averageCost),
      acquiredAt: form.acquiredAt,
      sector: form.sector.trim() || undefined,
      note: form.note.trim() || undefined,
    });
    setForm({ ...INITIAL_FORM, acquiredAt: form.acquiredAt });
    setError(null);
  }

  return (
    <main
      className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100"
      data-testid="portfolio-page"
    >
      <motion.header
        initial="hidden"
        animate="visible"
        variants={fadeUpVariants}
        className="mb-6"
      >
        <h1 className="text-2xl font-semibold tracking-tight">ポートフォリオ</h1>
        <p className="mt-1 text-sm text-slate-400">
          保有銘柄の登録と構成分析。現在価格連携は Phase 5 で実装予定です。
        </p>
      </motion.header>

      <section
        aria-label="KPI サマリー"
        className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        <KpiCard label="総取得額" value={formatCurrency(totalCost)} />
        <KpiCard
          label="現在評価額"
          value={currentValue === null ? "—" : formatCurrency(currentValue)}
        />
        <KpiCard
          label="含み損益"
          value={pnl === null ? "—" : formatCurrency(pnl)}
          tone={pnl === null ? "neutral" : pnl >= 0 ? "positive" : "negative"}
        />
        <KpiCard
          label="含み損益率"
          value={pnlRate === null ? "—" : `${pnlRate.toFixed(2)}%`}
          tone={pnlRate === null ? "neutral" : pnlRate >= 0 ? "positive" : "negative"}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section
          aria-label="保有銘柄一覧"
          className="inp-glass rounded-xl border border-slate-800 p-4 lg:col-span-2"
        >
          <h2 className="mb-3 text-sm font-semibold text-slate-200">保有銘柄一覧</h2>
          {holdings.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              保有銘柄はまだ登録されていません
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-400">
                  <tr>
                    <th className="px-2 py-1">symbol</th>
                    <th className="px-2 py-1">name</th>
                    <th className="px-2 py-1">market</th>
                    <th className="px-2 py-1 text-right">quantity</th>
                    <th className="px-2 py-1 text-right">averageCost</th>
                    <th className="px-2 py-1">acquiredAt</th>
                    <th className="px-2 py-1">sector</th>
                    <th className="px-2 py-1 text-right">含み損益</th>
                    <th className="px-2 py-1" />
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => (
                    <tr
                      key={h.id}
                      data-testid={`holding-row-${h.id}`}
                      className="border-t border-slate-800/60"
                    >
                      <td className="px-2 py-1 font-mono">{h.symbol}</td>
                      <td className="px-2 py-1 text-slate-300">{h.name ?? "—"}</td>
                      <td className="px-2 py-1">{h.market}</td>
                      <td className="px-2 py-1 text-right">
                        <input
                          type="number"
                          className="inp-glass w-20 rounded bg-slate-900/60 px-2 py-1 text-right text-slate-100"
                          aria-label={`${h.symbol} の保有数量`}
                          value={h.quantity}
                          min={0}
                          onChange={(e) =>
                            updateHolding(h.id, { quantity: Number(e.target.value) })
                          }
                        />
                      </td>
                      <td className="px-2 py-1 text-right">
                        <input
                          type="number"
                          className="inp-glass w-24 rounded bg-slate-900/60 px-2 py-1 text-right text-slate-100"
                          aria-label={`${h.symbol} の平均取得単価`}
                          value={h.averageCost}
                          min={0}
                          step={0.01}
                          onChange={(e) =>
                            updateHolding(h.id, { averageCost: Number(e.target.value) })
                          }
                        />
                      </td>
                      <td className="px-2 py-1">{h.acquiredAt}</td>
                      <td className="px-2 py-1 text-slate-300">{h.sector ?? "—"}</td>
                      <td className="px-2 py-1 text-right text-slate-400">—</td>
                      <td className="px-2 py-1 text-right">
                        <button
                          type="button"
                          className="inp-neon-ring rounded border border-rose-700/50 bg-rose-900/30 px-2 py-1 text-xs text-rose-200 hover:bg-rose-900/60"
                          aria-label={`${h.symbol} を削除`}
                          onClick={() => removeHolding(h.id)}
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-700 text-xs text-slate-400">
                    <td colSpan={3} className="px-2 py-1">
                      合計
                    </td>
                    <td className="px-2 py-1 text-right">{formatNumber(holdings.length)} 銘柄</td>
                    <td colSpan={5} className="px-2 py-1 text-right">
                      {formatCurrency(totalCost)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        <aside
          aria-label="構成チャート"
          className="inp-glass flex flex-col gap-4 rounded-xl border border-slate-800 p-4"
        >
          <ChartPanel
            title="セクター構成"
            emptyMessage="セクター未登録"
            data={bySector}
            colors={SECTOR_COLORS}
          />
          <ChartPanel
            title="市場別構成"
            emptyMessage="銘柄未登録"
            data={byMarket}
            colors={byMarket.map((d) => MARKET_COLORS[d.name as HoldingMarket] ?? "#64748b")}
          />
        </aside>
      </div>

      <section
        aria-label="銘柄追加フォーム"
        className="inp-glass mt-6 rounded-xl border border-slate-800 p-4"
      >
        <h2 className="mb-3 text-sm font-semibold text-slate-200">銘柄を追加</h2>
        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4"
        >
          <LabeledInput
            label="symbol"
            ariaLabel="銘柄コード"
            value={form.symbol}
            onChange={(v) => setForm({ ...form, symbol: v })}
            required
          />
          <LabeledInput
            label="name"
            ariaLabel="銘柄名"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
          />
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            market
            <select
              aria-label="市場"
              className="inp-glass rounded bg-slate-900/60 px-2 py-1 text-sm text-slate-100"
              value={form.market}
              onChange={(e) =>
                setForm({ ...form, market: e.target.value as HoldingMarket })
              }
            >
              <option value="JP">JP</option>
              <option value="US">US</option>
            </select>
          </label>
          <LabeledInput
            label="quantity"
            ariaLabel="保有数量"
            type="number"
            value={form.quantity}
            onChange={(v) => setForm({ ...form, quantity: v })}
            required
          />
          <LabeledInput
            label="averageCost"
            ariaLabel="平均取得単価"
            type="number"
            step="0.01"
            value={form.averageCost}
            onChange={(v) => setForm({ ...form, averageCost: v })}
            required
          />
          <LabeledInput
            label="acquiredAt"
            ariaLabel="取得日"
            type="date"
            value={form.acquiredAt}
            onChange={(v) => setForm({ ...form, acquiredAt: v })}
            required
          />
          <LabeledInput
            label="sector"
            ariaLabel="セクター"
            value={form.sector}
            onChange={(v) => setForm({ ...form, sector: v })}
          />
          <LabeledInput
            label="note"
            ariaLabel="メモ"
            value={form.note}
            onChange={(v) => setForm({ ...form, note: v })}
          />
          <div className="col-span-full flex items-center gap-3">
            <button
              type="submit"
              className="inp-neon-ring rounded bg-sky-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              追加
            </button>
            {error ? (
              <p role="alert" className="text-xs text-rose-300">
                {error}
              </p>
            ) : null}
          </div>
        </form>
      </section>
    </main>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}

function KpiCard({ label, value, tone = "neutral" }: KpiCardProps): JSX.Element {
  const toneClass =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "negative"
        ? "text-rose-300"
        : "text-slate-100";
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUpVariants}
      className="inp-glass rounded-xl border border-slate-800 p-4"
    >
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${toneClass}`} data-testid={`kpi-${label}`}>
        {value}
      </div>
    </motion.div>
  );
}

interface LabeledInputProps {
  label: string;
  ariaLabel: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  required?: boolean;
}

function LabeledInput({
  label,
  ariaLabel,
  value,
  onChange,
  type = "text",
  step,
  required,
}: LabeledInputProps): JSX.Element {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-400">
      {label}
      {required ? <span className="sr-only">必須</span> : null}
      <input
        type={type}
        step={step}
        aria-label={ariaLabel}
        aria-required={required ? "true" : undefined}
        className="inp-glass rounded bg-slate-900/60 px-2 py-1 text-sm text-slate-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

interface ChartPanelProps {
  title: string;
  emptyMessage: string;
  data: Array<{ name: string; value: number }>;
  colors: string[];
}

function ChartPanel({ title, emptyMessage, data, colors }: ChartPanelProps): JSX.Element {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold text-slate-300">{title}</h3>
      {data.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-500">{emptyMessage}</p>
      ) : (
        <PieChartBlock data={data} colors={colors} />
      )}
    </div>
  );
}

interface PieChartBlockProps {
  data: Array<{ name: string; value: number }>;
  colors: string[];
}

function PieChartBlock({ data, colors }: PieChartBlockProps): JSX.Element {
  return (
    <div className="h-[200px] w-full" data-testid="chart-block">
      <ResponsiveContainer width={400} height={200}>
        <PieChart width={400} height={200}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={70}
            innerRadius={35}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]!} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

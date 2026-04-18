"use client";

import { useState, type FormEvent } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Disclaimer,
  NeonBadge,
  NeonButton,
  NeonCard,
  Stat,
} from "@/components/ui";
import { GlobalTabs } from "@/components/navigation/GlobalTabs";
import { cn } from "@/lib/cn";
import type { PortfolioWithValue } from "@/lib/services/portfolio";

const PIE_COLORS = ["#00E1FF", "#2A6BFF", "#B86BFF", "#FF3B6B", "#FFB347", "#7CFC00", "#FFD700", "#FF69B4"];

type Market = "JP" | "US";
type Currency = "JPY" | "USD";

interface FormState {
  code: string;
  market: Market;
  name: string;
  quantity: string;
  avgCost: string;
  currency: Currency;
  note: string;
}

const initialForm: FormState = {
  code: "",
  market: "JP",
  name: "",
  quantity: "",
  avgCost: "",
  currency: "JPY",
  note: "",
};

function fmtJpy(n: number): string {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

function fmtPrice(n: number | null, currency: Currency): string {
  if (n == null) return "—";
  const sym = currency === "USD" ? "$" : "¥";
  return `${sym}${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function fmtPercent(n: number): string {
  return `${n.toFixed(2)}%`;
}

function pnlClass(n: number): string {
  if (n > 0) return "text-emerald-400";
  if (n < 0) return "text-alert";
  return "text-text/70";
}

async function fetchPortfolio(): Promise<PortfolioWithValue[]> {
  const res = await fetch("/api/portfolio");
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "fetch failed");
  return json.data as PortfolioWithValue[];
}

async function postPortfolio(input: unknown): Promise<void> {
  const res = await fetch("/api/portfolio", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "save failed");
}

async function deletePortfolio(id: number): Promise<void> {
  const res = await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? "delete failed");
  }
}

export default function PortfolioPage() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["portfolio"],
    queryFn: fetchPortfolio,
  });

  const [form, setForm] = useState<FormState>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  const addMut = useMutation({
    mutationFn: postPortfolio,
    onSuccess: () => {
      setForm(initialForm);
      setFormError(null);
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const delMut = useMutation({
    mutationFn: deletePortfolio,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const quantity = Number(form.quantity);
    const avgCost = Number(form.avgCost);
    if (!form.code || !form.name) {
      setFormError("code と name は必須です");
      return;
    }
    if (!Number.isFinite(quantity) || quantity < 0) {
      setFormError("quantity が不正です");
      return;
    }
    if (!Number.isFinite(avgCost) || avgCost < 0) {
      setFormError("avgCost が不正です");
      return;
    }
    addMut.mutate({
      code: form.code.trim(),
      market: form.market,
      name: form.name.trim(),
      quantity,
      avgCost,
      currency: form.currency,
      note: form.note.trim() || null,
    });
  };

  const onDelete = (id: number, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    delMut.mutate(id);
  };

  const rows = query.data ?? [];
  const totalValue = rows.reduce((s, r) => s + r.marketValueJpy, 0);
  const totalPnl = rows.reduce((s, r) => s + r.pnlJpy, 0);
  const totalCost = rows.reduce((s, r) => s + r.costJpy, 0);
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const pieData = rows
    .filter((r) => r.marketValueJpy > 0)
    .map((r) => ({ name: `${r.code} ${r.name}`, value: r.marketValueJpy }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="heading-en text-2xl font-bold text-neon drop-shadow-[0_0_12px_rgba(0,225,255,0.8)]">
          ⚡ Portfolio
        </h1>
        <div className="flex items-center gap-3">
          <GlobalTabs />
          <NeonBadge signal={totalPnl >= 0 ? "go" : "stop"} label="PNL" />
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <NeonCard glow="strong">
          <Stat label="Total Value (JPY)" value={fmtJpy(totalValue)} />
        </NeonCard>
        <NeonCard glow={totalPnl >= 0 ? "subtle" : "alert"}>
          <Stat
            label="Total PnL"
            value={fmtJpy(totalPnl)}
            delta={Number(totalPnlPct.toFixed(2))}
            unit="%"
          />
        </NeonCard>
        <NeonCard glow="subtle">
          <Stat label="Positions" value={rows.length} />
        </NeonCard>
      </section>

      <section className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <NeonCard className="overflow-x-auto">
          <h2 className="heading-en mb-4 text-sm text-text/60">Holdings</h2>
          {query.isLoading && <p className="text-text/70">Loading...</p>}
          {query.isError && (
            <p className="text-alert">Error: {(query.error as Error).message}</p>
          )}
          {!query.isLoading && rows.length === 0 && (
            <p className="text-text/60">No positions yet. Add one below.</p>
          )}
          {rows.length > 0 && (
            <table className="min-w-full text-sm tabular-nums">
              <thead className="text-text/60">
                <tr className="text-left">
                  <th className="px-2 py-1">Code</th>
                  <th className="px-2 py-1">Name</th>
                  <th className="px-2 py-1">Mkt</th>
                  <th className="px-2 py-1 text-right">Qty</th>
                  <th className="px-2 py-1 text-right">Avg Cost</th>
                  <th className="px-2 py-1">Cur</th>
                  <th className="px-2 py-1 text-right">Price</th>
                  <th className="px-2 py-1 text-right">Value (¥)</th>
                  <th className="px-2 py-1 text-right">PnL (¥)</th>
                  <th className="px-2 py-1 text-right">Weight</th>
                  <th className="px-2 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-text/10">
                    <td className="px-2 py-1">{r.code}</td>
                    <td className="px-2 py-1">{r.name}</td>
                    <td className="px-2 py-1">{r.market}</td>
                    <td className="px-2 py-1 text-right">
                      {r.quantity.toLocaleString()}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {fmtPrice(r.avgCost, r.currency as Currency)}
                    </td>
                    <td className="px-2 py-1">{r.currency}</td>
                    <td className="px-2 py-1 text-right">
                      {fmtPrice(r.currentPrice, r.priceCurrency)}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {fmtJpy(r.marketValueJpy)}
                    </td>
                    <td className={cn("px-2 py-1 text-right", pnlClass(r.pnlJpy))}>
                      {fmtJpy(r.pnlJpy)}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {fmtPercent(r.weightPercent)}
                    </td>
                    <td className="px-2 py-1 text-right">
                      <NeonButton
                        size="sm"
                        variant="danger"
                        onClick={() => onDelete(r.id, r.name)}
                        isLoading={delMut.isPending && delMut.variables === r.id}
                      >
                        削除
                      </NeonButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </NeonCard>

        <NeonCard>
          <h2 className="heading-en mb-4 text-sm text-text/60">Allocation</h2>
          {pieData.length === 0 ? (
            <p className="text-text/60">No data</p>
          ) : (
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    stroke="#050B1A"
                  >
                    {pieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => fmtJpy(Number(v))}
                    contentStyle={{
                      background: "#050B1A",
                      border: "1px solid #00E1FF",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </NeonCard>
      </section>

      <NeonCard>
        <h2 className="heading-en mb-4 text-sm text-text/60">Add / Update Position</h2>
        <form
          onSubmit={onSubmit}
          className="grid gap-3 md:grid-cols-3 lg:grid-cols-4"
        >
          <label className="flex flex-col gap-1 text-xs text-text/70">
            Code*
            <input
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="rounded-md border border-text/20 bg-bg/60 px-2 py-1.5 text-sm text-text outline-none focus:border-neon"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text/70">
            Market
            <select
              value={form.market}
              onChange={(e) =>
                setForm({ ...form, market: e.target.value as Market })
              }
              className="rounded-md border border-text/20 bg-bg/60 px-2 py-1.5 text-sm text-text outline-none focus:border-neon"
            >
              <option value="JP">JP</option>
              <option value="US">US</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-text/70">
            Name*
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-md border border-text/20 bg-bg/60 px-2 py-1.5 text-sm text-text outline-none focus:border-neon"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text/70">
            Currency
            <select
              value={form.currency}
              onChange={(e) =>
                setForm({ ...form, currency: e.target.value as Currency })
              }
              className="rounded-md border border-text/20 bg-bg/60 px-2 py-1.5 text-sm text-text outline-none focus:border-neon"
            >
              <option value="JPY">JPY</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-text/70">
            Quantity
            <input
              type="number"
              min="0"
              step="any"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="rounded-md border border-text/20 bg-bg/60 px-2 py-1.5 text-sm text-text outline-none focus:border-neon"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text/70">
            Avg Cost
            <input
              type="number"
              min="0"
              step="any"
              value={form.avgCost}
              onChange={(e) => setForm({ ...form, avgCost: e.target.value })}
              className="rounded-md border border-text/20 bg-bg/60 px-2 py-1.5 text-sm text-text outline-none focus:border-neon"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text/70 md:col-span-2 lg:col-span-2">
            Note
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="rounded-md border border-text/20 bg-bg/60 px-2 py-1.5 text-sm text-text outline-none focus:border-neon"
            />
          </label>
          <div className="flex items-end">
            <NeonButton type="submit" isLoading={addMut.isPending}>
              追加 / 更新
            </NeonButton>
          </div>
        </form>
        {formError && <p className="mt-3 text-sm text-alert">{formError}</p>}
      </NeonCard>

      <Disclaimer />
    </main>
  );
}

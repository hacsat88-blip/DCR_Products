"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, SectionHead, Stat, UpDown } from "@/components/ember/ui";
import { DonutChart, type DonutSlice } from "@/components/ember/charts";
import { HoldingRow, type Holding } from "@/components/ember/composites";
import type { PortfolioWithValue } from "@/lib/services/portfolio";

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

async function fetchPortfolio(): Promise<PortfolioWithValue[]> {
  const r = await fetch("/api/portfolio");
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? "fetch failed");
  return j.data as PortfolioWithValue[];
}
async function postPortfolio(input: unknown): Promise<void> {
  const r = await fetch("/api/portfolio", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? "save failed");
}
async function deletePortfolio(id: number): Promise<void> {
  const r = await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error ?? "delete failed");
  }
}

function rowToHolding(r: PortfolioWithValue): Holding {
  return {
    id: String(r.id),
    ticker: r.code,
    name: r.name,
    sector: r.market === "JP" ? "日本株" : "米国株",
    price: r.currentPrice ?? 0,
    change: 0,
    changePct: 0,
    currency: r.currency as Currency,
    quantity: r.quantity,
    cost: r.avgCost * r.quantity,
    marketValue: r.marketValueJpy,
    pl: r.pnlJpy,
    plPct: r.pnlPercent,
    weight: Math.max(0, Math.min(1, r.weightPercent / 100)),
  };
}

const inputCls =
  "rounded-md border border-border bg-bg-2 px-3 py-2 text-sm text-ink outline-none focus:border-[color:var(--coral)]";
const labelCls = "flex flex-col gap-1 text-ink-soft";

export default function PortfolioPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["portfolio"], queryFn: fetchPortfolio });

  const [form, setForm] = React.useState<FormState>(initialForm);
  const [formError, setFormError] = React.useState<string | null>(null);

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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const quantity = Number(form.quantity);
    const avgCost = Number(form.avgCost);
    if (!form.code || !form.name) {
      setFormError("コードと名称は必須です");
      return;
    }
    if (!Number.isFinite(quantity) || quantity < 0) {
      setFormError("数量が不正です");
      return;
    }
    if (!Number.isFinite(avgCost) || avgCost < 0) {
      setFormError("平均取得単価が不正です");
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
  const holdings = rows.map(rowToHolding);
  const totalValue = rows.reduce((s, r) => s + r.marketValueJpy, 0);
  const totalPnl = rows.reduce((s, r) => s + r.pnlJpy, 0);
  const totalCost = rows.reduce((s, r) => s + r.costJpy, 0);
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const donutSlices: DonutSlice[] = rows
    .filter((r) => r.marketValueJpy > 0)
    .map((r) => ({ id: String(r.id), label: `${r.code} ${r.name}`, value: r.marketValueJpy }));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <SectionHead eyebrow="PORTFOLIO" title="ポートフォリオ" jp="保有銘柄と評価額" />

      {/* Hero stats */}
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <Stat label="評価額 (JPY)" value={fmtJpy(totalValue)} />
        </Card>
        <Card>
          <Stat
            label="評価損益"
            value={fmtJpy(totalPnl)}
            sub={<UpDown value={totalPnlPct} />}
          />
        </Card>
        <Card>
          <Stat label="保有銘柄数" value={rows.length} mono />
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card padded={false}>
          <div className="p-6 pb-3">
            <SectionHead eyebrow="HOLDINGS" title="保有銘柄" />
          </div>
          <div className="px-6 pb-6">
            {query.isLoading && <p className="text-ink-mute">読み込み中…</p>}
            {query.isError && (
              <p style={{ color: "var(--down)" }}>エラー: {(query.error as Error).message}</p>
            )}
            {!query.isLoading && holdings.length === 0 && (
              <p className="text-ink-mute">保有銘柄がありません。下のフォームから追加してください。</p>
            )}
            {holdings.length > 0 && (
              <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                {holdings.map((h, i) => (
                  <div key={h.id} className="flex items-center gap-3 py-3">
                    <div className="flex-1 min-w-0">
                      <HoldingRow holding={h} />
                    </div>
                    <button
                      type="button"
                      onClick={() => onDelete(rows[i].id, h.name)}
                      disabled={delMut.isPending && delMut.variables === rows[i].id}
                      className="rounded-md border border-border px-3 py-1 text-ink-soft hover:bg-bg-2"
                      style={{ fontSize: 11 }}
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <SectionHead eyebrow="ALLOCATION" title="構成比" />
          <div className="mt-4 flex items-center justify-center">
            {donutSlices.length > 0 ? (
              <DonutChart slices={donutSlices} size={240} />
            ) : (
              <div className="text-ink-mute" style={{ fontSize: 12 }}>データなし</div>
            )}
          </div>
        </Card>
      </section>

      <Card>
        <SectionHead eyebrow="ADD / UPDATE" title="銘柄を追加・更新" />
        <form onSubmit={onSubmit} className="mt-6 grid gap-3 md:grid-cols-3 lg:grid-cols-4" style={{ fontSize: 12 }}>
          <label className={labelCls}>
            コード*
            <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputCls} />
          </label>
          <label className={labelCls}>
            市場
            <select value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value as Market })} className={inputCls}>
              <option value="JP">JP</option>
              <option value="US">US</option>
            </select>
          </label>
          <label className={labelCls}>
            名称*
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </label>
          <label className={labelCls}>
            通貨
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })} className={inputCls}>
              <option value="JPY">JPY</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label className={labelCls}>
            数量
            <input type="number" min="0" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={inputCls} />
          </label>
          <label className={labelCls}>
            平均取得単価
            <input type="number" min="0" step="any" value={form.avgCost} onChange={(e) => setForm({ ...form, avgCost: e.target.value })} className={inputCls} />
          </label>
          <label className={`${labelCls} md:col-span-2`}>
            メモ
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputCls} />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={addMut.isPending}
              className="rounded-full px-5 py-2 text-white"
              style={{ background: "var(--coral)", fontSize: 13, fontWeight: 600, opacity: addMut.isPending ? 0.6 : 1 }}
            >
              {addMut.isPending ? "保存中…" : "追加 / 更新"}
            </button>
          </div>
        </form>
        {formError && <p className="mt-3" style={{ color: "var(--down)", fontSize: 12 }}>{formError}</p>}
      </Card>
    </main>
  );
}

"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Icon, SectionHead, SectorDot, Stat, UpDown } from "@/components/ember/ui";
import { DonutChart, type DonutSlice } from "@/components/ember/charts";
import { HoldingRow, type Holding } from "@/components/ember/composites";
import type { PortfolioWithValue } from "@/lib/services/portfolio";
import { ToastProvider, ToastContainer, useToast } from "@/components/ember/ui/Toast";

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

function AnimatedValue({ value, format }: { value: number; format: (n: number) => string }) {
  const [displayed, setDisplayed] = React.useState(value);
  const prevRef = React.useRef(value);

  React.useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = to;
    if (from === to) return;

    const duration = 600;
    const start = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(from + (to - from) * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{format(displayed)}</>;
}

function PortfolioPageInner() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["portfolio"], queryFn: fetchPortfolio });
  const { addToast } = useToast();

  const [form, setForm] = React.useState<FormState>(initialForm);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [lookupStatus, setLookupStatus] = React.useState<"idle" | "loading" | "done" | "notfound">("idle");
  const [lookupSector, setLookupSector] = React.useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<{ id: number; name: string } | null>(null);
  const lookupTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lookupAbortRef = React.useRef<AbortController | null>(null);
  const lookupContextRef = React.useRef<{ code: string; market: Market }>({
    code: initialForm.code,
    market: initialForm.market,
  });

  React.useEffect(() => {
    return () => {
      if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
      lookupAbortRef.current?.abort();
    };
  }, []);

  // Pre-fill form from URL params (?add=CODE&market=JP|US&name=NAME)
  const prefillApplied = React.useRef(false);
  React.useEffect(() => {
    if (prefillApplied.current) return;
    prefillApplied.current = true;
    const params = new URLSearchParams(window.location.search);
    const addCode = params.get("add");
    if (!addCode) return;
    const addMarket = params.get("market") as Market | null;
    const addName = params.get("name");
    // Use functional updater queued in a microtask to satisfy lint
    queueMicrotask(() => {
      setForm((f) => ({
        ...f,
        code: addCode,
        market: addMarket === "US" ? "US" : "JP",
        name: addName ?? "",
        currency: addMarket === "US" ? "USD" : "JPY",
      }));
      if (addName) setLookupStatus("done");
    });
    setTimeout(() => {
      document.querySelector("[data-form-section]")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  }, []);

  const addMut = useMutation({
    mutationFn: postPortfolio,
    onSuccess: () => {
      setForm(initialForm);
      setFormError(null);
      setLookupStatus("idle");
      setLookupSector(null);
      lookupContextRef.current = {
        code: initialForm.code,
        market: initialForm.market,
      };
      qc.invalidateQueries({ queryKey: ["portfolio"] });
      addToast("銘柄を追加しました", "success");
    },
    onError: (e: Error) => setFormError(e.message),
  });
  const delMut = useMutation({
    mutationFn: deletePortfolio,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio"] });
      addToast("銘柄を削除しました", "success");
    },
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
    setDeleteConfirm({ id, name });
  };

  const executeDelete = () => {
    if (!deleteConfirm) return;
    delMut.mutate(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && deleteConfirm) {
        cancelDelete();
      }
    };
    if (deleteConfirm) {
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [deleteConfirm]);

  const lookupCode = React.useCallback(async (code: string, market: Market) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    lookupAbortRef.current?.abort();
    const controller = new AbortController();
    lookupAbortRef.current = controller;
    setLookupStatus("loading");
    try {
      const res = await fetch(
        `/api/stocks/lookup?code=${encodeURIComponent(trimmed)}&market=${market}`,
        { signal: controller.signal },
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "lookup failed");
      if (controller.signal.aborted) return;
      const latest = lookupContextRef.current;
      if (latest.code.trim() !== trimmed || latest.market !== market) return;
      const { name, currency, sector } = j.data as { name: string; currency: Currency; sector: string | null };
      setForm((f) =>
        f.code.trim() === trimmed && f.market === market
          ? { ...f, name, currency }
          : f,
      );
      setLookupSector(sector ?? null);
      setLookupStatus("done");
    } catch (error) {
      if ((error as { name?: string }).name === "AbortError") return;
      const latest = lookupContextRef.current;
      if (latest.code.trim() === trimmed && latest.market === market) {
        setLookupStatus("notfound");
      }
    } finally {
      if (lookupAbortRef.current === controller) {
        lookupAbortRef.current = null;
      }
    }
  }, []);

  const onCodeChange = (newCode: string) => {
    lookupContextRef.current = { code: newCode, market: form.market };
    setForm((f) => ({ ...f, code: newCode }));
    setLookupStatus("idle");
    setLookupSector(null);
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    lookupAbortRef.current?.abort();
    lookupAbortRef.current = null;
    if (newCode.trim().length >= 2) {
      lookupTimerRef.current = setTimeout(() => {
        lookupCode(newCode, form.market);
      }, 600);
    }
  };

  const onMarketChange = (newMarket: Market) => {
    lookupContextRef.current = { code: form.code, market: newMarket };
    setForm((f) => ({ ...f, market: newMarket, currency: newMarket === "JP" ? "JPY" : "USD" }));
    setLookupStatus("idle");
    setLookupSector(null);
    if (form.code.trim().length >= 3) {
      if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
      lookupAbortRef.current?.abort();
      lookupAbortRef.current = null;
      lookupTimerRef.current = setTimeout(() => {
        lookupCode(form.code, newMarket);
      }, 300);
    }
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
          <Stat label="評価額 (JPY)" value={<AnimatedValue value={totalValue} format={fmtJpy} />} />
        </Card>
        <Card>
          <Stat
            label="評価損益"
            value={<AnimatedValue value={totalPnl} format={fmtJpy} />}
            sub={<UpDown value={totalPnlPct} />}
          />
        </Card>
        <Card>
          <Stat label="保有銘柄数" value={<AnimatedValue value={rows.length} format={(n) => String(Math.round(n))} />} mono />
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
                    <a
                      href={`/stocks?code=${h.ticker}`}
                      className="grid h-7 w-7 place-items-center rounded-md border border-border text-ink-soft hover:text-coral hover:border-coral transition-colors"
                      title="リサーチ"
                      aria-label="リサーチ"
                    >
                      <Icon name="search" size={13} />
                    </a>
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

      <div data-form-section>
      <Card>
        <SectionHead eyebrow="ADD / UPDATE" title="銘柄を追加・更新" />
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" style={{ fontSize: 12 }}>
          <div className="grid gap-3 md:grid-cols-4">
          <label className={labelCls}>
            コード*
            <div className="relative">
              <input
                required
                value={form.code}
                onChange={(e) => onCodeChange(e.target.value)}
                onBlur={() => {
                  if (form.code.trim().length >= 2 && lookupStatus === "idle") {
                    lookupCode(form.code, form.market);
                  }
                }}
                placeholder="例: 7203 / NVDA"
                className={`${inputCls}${lookupStatus === "done" ? " lookup-glow" : ""}`}
              />
              {lookupStatus === "loading" && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-mute" aria-label="検索中">
                  <Icon name="spinner" size={12} />
                </span>
              )}
              {lookupStatus === "done" && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: "var(--up)" }} aria-label="取得完了">
                  <Icon name="check" size={12} />
                </span>
              )}
            </div>
          </label>
          <label className={labelCls}>
            市場
            <select value={form.market} onChange={(e) => onMarketChange(e.target.value as Market)} className={inputCls}>
              <option value="JP">JP</option>
              <option value="US">US</option>
            </select>
          </label>
          <label className={labelCls}>
            名称*
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={lookupStatus === "loading" ? "検索中…" : "自動入力 or 手動入力"}
              className={inputCls}
              style={{ opacity: lookupStatus === "loading" ? 0.6 : 1 }}
            />
            {lookupSector && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-ink-mute border border-border" style={{ fontSize: 10 }}>
                <SectorDot sector={lookupSector} />
                {lookupSector}
              </span>
            )}
          </label>
          <label className={labelCls}>
            通貨
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })} className={inputCls}>
              <option value="JPY">JPY</option>
              <option value="USD">USD</option>
            </select>
          </label>
          </div>
          <div className="border-t border-border" />
          <div className="grid gap-3 md:grid-cols-4">
          <label className={labelCls} htmlFor="quantity-input">
            数量
            <input id="quantity-input" type="number" min="0" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={inputCls} />
          </label>
          <label className={labelCls} htmlFor="avg-cost-input">
            平均取得単価
            <input id="avg-cost-input" type="number" min="0" step="any" value={form.avgCost} onChange={(e) => setForm({ ...form, avgCost: e.target.value })} className={inputCls} />
          </label>
          <label className={`${labelCls}`}>
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
          </div>
        </form>
        {formError && <p className="mt-3" style={{ color: "var(--down)", fontSize: 12 }}>{formError}</p>}
      </Card>
      </div>

      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={cancelDelete}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div
            className="rounded-lg p-6 shadow-xl"
            style={{ background: "var(--surface)", maxWidth: 400 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="delete-dialog-title" className="text-ink font-semibold" style={{ fontSize: 16 }}>
              銘柄を削除
            </h3>
            <p className="mt-2 text-ink-soft" style={{ fontSize: 14 }}>
              「{deleteConfirm.name}」を削除してもよろしいですか？
            </p>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={cancelDelete}
                className="rounded-md px-4 py-2 border border-border text-ink-soft hover:bg-bg-2"
                style={{ fontSize: 13 }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="rounded-md px-4 py-2 text-white"
                style={{ background: "var(--down)", fontSize: 13, fontWeight: 600 }}
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </main>
  );
}

export default function PortfolioPage() {
  return (
    <ToastProvider>
      <PortfolioPageInner />
    </ToastProvider>
  );
}

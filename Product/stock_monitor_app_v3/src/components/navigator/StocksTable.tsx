"use client";

import { useMemo, useState } from "react";

import clsx from "clsx";

import type {
  StockSelectionResult,
  DebateResult,
  DebateSignal,
  SelectedStock,
} from "@/types/navigator";

// ── Signal badge mapping ────────────────────────────────

const SIGNAL_STYLE: Record<DebateSignal, { label: string; cls: string }> = {
  go: { label: "🟢 go", cls: "border-positive/40 text-positive bg-positive/5" },
  watch: { label: "🟡 watch", cls: "border-amber/40 text-amber bg-amber/5" },
  out: { label: "🔴 out", cls: "border-danger/40 text-danger bg-danger/5" },
};

// ── Sort helpers ────────────────────────────────────────

type SortKey = "code" | "price" | "signal" | "fcfYield";
type SortDir = "asc" | "desc";

const SIGNAL_RANK: Record<DebateSignal, number> = { go: 0, watch: 1, out: 2 };

function parseNum(s: string): number {
  const n = parseFloat(s.replace(/[¥$,%]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// ── Component ───────────────────────────────────────────

interface StocksTableProps {
  stocks: StockSelectionResult;
  debate: DebateResult;
}

export function StocksTable({ stocks, debate }: StocksTableProps): JSX.Element {
  const [sortKey, setSortKey] = useState<SortKey>("code");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Build a code→signal lookup from debate verdicts
  const signalMap = useMemo(() => {
    const map = new Map<string, DebateSignal>();
    for (const v of debate.verdicts) {
      map.set(v.code, v.signal);
    }
    return map;
  }, [debate]);

  // Sort rows
  const sortedRows = useMemo(() => {
    const rows = [...stocks.stocks];
    const dir = sortDir === "asc" ? 1 : -1;

    rows.sort((a: SelectedStock, b: SelectedStock) => {
      switch (sortKey) {
        case "code":
          return a.code.localeCompare(b.code) * dir;
        case "price":
          return (parseNum(a.price) - parseNum(b.price)) * dir;
        case "fcfYield":
          return (parseNum(a.fcfYield) - parseNum(b.fcfYield)) * dir;
        case "signal": {
          const sa = signalMap.get(a.code) ?? "watch";
          const sb = signalMap.get(b.code) ?? "watch";
          return (SIGNAL_RANK[sa] - SIGNAL_RANK[sb]) * dir;
        }
        default:
          return 0;
      }
    });

    return rows;
  }, [stocks, sortKey, sortDir, signalMap]);

  // Column click handler
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <section className="animate-fade-in border border-glass-border bg-panel">
      <h3 className="border-b border-glass-border px-4 py-3 font-semiboldtext-[10px] uppercase tracking-widest text-text-muted">
        ▸ STOCK SELECTION + DEBATE SIGNALS
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-glass-border">
              {[
                { key: null, label: "#", w: "w-8" },
                { key: "code" as SortKey, label: "CODE", w: "w-20" },
                { key: null, label: "NAME", w: "" },
                { key: "price" as SortKey, label: "PRICE", w: "w-24" },
                { key: "fcfYield" as SortKey, label: "FCF YIELD", w: "w-24" },
                { key: null, label: "CF MARGIN", w: "w-24" },
                { key: null, label: "CF TREND", w: "w-20" },
                { key: null, label: "SECTOR", w: "w-28" },
                { key: "signal" as SortKey, label: "SIGNAL", w: "w-24" },
              ].map(({ key, label, w }, i) => (
                <th
                  key={label + i}
                  className={clsx(
                    "whitespace-nowrap px-3 py-2 font-semiboldtext-[10px] uppercase tracking-widest text-text-muted",
                    w,
                    key && "cursor-pointer select-none hover:text-primary",
                  )}
                  onClick={key ? () => toggleSort(key) : undefined}
                  role={key ? "button" : undefined}
                  tabIndex={key ? 0 : undefined}
                  onKeyDown={key ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSort(key); } } : undefined}
                  aria-sort={key ? (sortKey === key ? (sortDir === "asc" ? "ascending" : "descending") : "none") : undefined}
                >
                  {label}
                  {key && sortIcon(key)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sortedRows.map((stock, idx) => {
              const signal = signalMap.get(stock.code) ?? "watch";
              const cfg = SIGNAL_STYLE[signal];

              return (
                <tr
                  key={stock.code}
                  className="border-b border-glass-border transition-colors hover:bg-positive/5"
                >
                  <td className="px-3 py-2 font-mono tabular-nums text-[10px] text-text-muted">
                    {String(idx + 1).padStart(2, "0")}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums text-sm text-text-primary">
                    {stock.code}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums text-sm text-text-primary">
                    {stock.name}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums text-sm text-text-secondary">
                    {stock.price}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums text-sm text-positive">
                    {stock.fcfYield}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums text-sm text-text-secondary">
                    {stock.cfMargin}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums text-sm text-text-secondary">
                    {stock.cfTrend}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums text-[11px] text-text-muted">
                    {stock.sector}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={clsx(
                        "inline-block rounded-lg border px-2 py-0.5 font-mono tabular-nums text-[10px] uppercase",
                        cfg.cls,
                      )}
                    >
                      {cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";

import {
  ETF_UNIVERSE_JP,
  ETF_UNIVERSE_US,
  type EtfEntry,
} from "@/data/etfUniverse";

type Market = "JP" | "US";
type SortKey = "symbol" | "expenseRatio";
type SortDir = "asc" | "desc";

const ALL_CATEGORIES: readonly EtfEntry["category"][] = [
  "Equity",
  "Bond",
  "Commodity",
  "REIT",
  "Thematic",
  "Multi-Asset",
];

function sortEntries(
  entries: readonly EtfEntry[],
  key: SortKey,
  dir: SortDir,
): EtfEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (key === "symbol") {
      return a.symbol.localeCompare(b.symbol);
    }
    return a.expenseRatio - b.expenseRatio;
  });
  return dir === "asc" ? sorted : sorted.reverse();
}

export default function EtfPage(): JSX.Element {
  const [market, setMarket] = useState<Market>("JP");
  const [query, setQuery] = useState<string>("");
  const [categories, setCategories] = useState<Set<EtfEntry["category"]>>(
    new Set(),
  );
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<EtfEntry | null>(null);

  const source = market === "JP" ? ETF_UNIVERSE_JP : ETF_UNIVERSE_US;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = source.filter((e) => {
      if (categories.size > 0 && !categories.has(e.category)) return false;
      if (!q) return true;
      return (
        e.symbol.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q)
      );
    });
    return sortEntries(base, sortKey, sortDir);
  }, [source, query, categories, sortKey, sortDir]);

  const toggleCategory = (c: EtfEntry["category"]): void => {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const toggleSort = (key: SortKey): void => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const ariaSort = (key: SortKey): "ascending" | "descending" | "none" => {
    if (sortKey !== key) return "none";
    return sortDir === "asc" ? "ascending" : "descending";
  };

  const inputClass =
    "inp-glass w-full rounded-[var(--inp-radius-control)] px-3 py-2 text-sm text-[var(--inp-text-primary)] placeholder:text-[var(--inp-text-muted)] outline-none focus-visible:inp-neon-ring";

  return (
    <main className="min-h-screen bg-[var(--inp-bg-base)] text-[var(--inp-text-primary)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:px-6 md:py-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              ETF ユニバース
            </h1>
            <p className="text-xs text-[var(--inp-text-secondary)]">
              JP / US の主要 ETF を検索・比較
            </p>
          </div>
          <p className="text-[11px] text-[var(--inp-text-muted)]">
            ⌘K でコマンドパレット
          </p>
        </header>

        <nav
          role="tablist"
          aria-label="市場"
          className="inp-glass inline-flex w-fit rounded-[var(--inp-radius-control)] p-1"
        >
          {(["JP", "US"] as const).map((m) => {
            const active = market === m;
            return (
              <button
                key={m}
                role="tab"
                aria-selected={active}
                aria-label={m === "JP" ? "日本株タブ" : "米国株タブ"}
                onClick={() => {
                  setMarket(m);
                  setSelected(null);
                }}
                className={`rounded-[8px] px-4 py-1.5 text-sm transition ${
                  active
                    ? "bg-[var(--inp-accent)]/15 text-[var(--inp-accent)] inp-neon-ring"
                    : "text-[var(--inp-text-secondary)] hover:text-[var(--inp-text-primary)]"
                }`}
              >
                {m}
              </button>
            );
          })}
        </nav>

        <div className="flex flex-col gap-3 md:flex-row md:items-start">
          <div className="md:w-80">
            <label className="flex flex-col gap-1 text-xs text-[var(--inp-text-secondary)]">
              <span>検索</span>
              <input
                type="search"
                aria-label="ETF検索"
                className={inputClass}
                placeholder="シンボル or 名前"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          <div
            role="group"
            aria-label="カテゴリフィルタ"
            className="flex flex-wrap gap-2"
          >
            {ALL_CATEGORIES.map((c) => {
              const active = categories.has(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={active}
                  aria-label={`カテゴリ: ${c}`}
                  onClick={() => toggleCategory(c)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    active
                      ? "border-[var(--inp-accent)] bg-[var(--inp-accent)]/10 text-[var(--inp-accent)]"
                      : "border-[var(--inp-border)] text-[var(--inp-text-secondary)] hover:border-[var(--inp-border-strong)]"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <div className="inp-glass overflow-hidden rounded-[var(--inp-radius-card)]">
          {filtered.length === 0 ? (
            <div
              role="status"
              className="flex min-h-[240px] items-center justify-center px-6 py-10 text-center text-sm text-[var(--inp-text-secondary)]"
            >
              該当する ETF はありません
            </div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[var(--inp-bg-surface)] text-xs text-[var(--inp-text-secondary)]">
                <tr>
                  <th
                    scope="col"
                    aria-sort={ariaSort("symbol")}
                    className="px-3 py-2 text-left"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort("symbol")}
                      aria-label="シンボルでソート"
                      className="hover:text-[var(--inp-accent)]"
                    >
                      シンボル
                    </button>
                  </th>
                  <th scope="col" className="px-3 py-2 text-left">
                    名前
                  </th>
                  <th scope="col" className="px-3 py-2 text-left">
                    カテゴリ
                  </th>
                  <th scope="col" className="px-3 py-2 text-left">
                    プロバイダー
                  </th>
                  <th
                    scope="col"
                    aria-sort={ariaSort("expenseRatio")}
                    className="px-3 py-2 text-right"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort("expenseRatio")}
                      aria-label="経費率でソート"
                      className="hover:text-[var(--inp-accent)]"
                    >
                      経費率(%)
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={`${e.exchange}-${e.symbol}`}
                    data-testid={`etf-row-${e.symbol}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${e.symbol} ${e.name} の詳細を開く`}
                    onClick={() => setSelected(e)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        setSelected(e);
                      }
                    }}
                    className="cursor-pointer border-t border-[var(--inp-border)] transition hover:bg-[var(--inp-bg-elevated)] focus-visible:bg-[var(--inp-bg-elevated)] focus-visible:outline-none"
                  >
                    <td className="px-3 py-2 font-mono text-[var(--inp-accent)]">
                      {e.symbol}
                    </td>
                    <td className="px-3 py-2">{e.name}</td>
                    <td className="px-3 py-2 text-[var(--inp-text-secondary)]">
                      {e.category}
                    </td>
                    <td className="px-3 py-2 text-[var(--inp-text-secondary)]">
                      {e.issuer}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {e.expenseRatio.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selected ? (
          <motion.aside
            key={selected.symbol}
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.symbol} 詳細`}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            className="inp-glass fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col gap-3 border-l border-[var(--inp-border)] p-5"
          >
            <header className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs text-[var(--inp-text-muted)]">
                  {selected.exchange}
                </p>
                <h2 className="text-xl font-semibold text-[var(--inp-accent)]">
                  {selected.symbol}
                </h2>
                <p className="text-sm text-[var(--inp-text-primary)]">
                  {selected.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="詳細を閉じる"
                className="rounded-[var(--inp-radius-control)] border border-[var(--inp-border)] px-2 py-1 text-xs text-[var(--inp-text-secondary)] hover:border-[var(--inp-accent)] hover:text-[var(--inp-accent)]"
              >
                閉じる
              </button>
            </header>
            <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
              <dt className="text-[var(--inp-text-secondary)]">symbol</dt>
              <dd>{selected.symbol}</dd>
              <dt className="text-[var(--inp-text-secondary)]">name</dt>
              <dd>{selected.name}</dd>
              <dt className="text-[var(--inp-text-secondary)]">category</dt>
              <dd>{selected.category}</dd>
              <dt className="text-[var(--inp-text-secondary)]">provider</dt>
              <dd>{selected.issuer}</dd>
              <dt className="text-[var(--inp-text-secondary)]">expenseRatio</dt>
              <dd>{selected.expenseRatio.toFixed(3)}%</dd>
              <dt className="text-[var(--inp-text-secondary)]">exchange</dt>
              <dd>{selected.exchange}</dd>
            </dl>
            <p className="mt-auto text-[11px] text-[var(--inp-text-muted)]">
              価格・パフォーマンス情報は今後追加予定
            </p>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

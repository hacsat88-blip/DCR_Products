"use client";

import React, { useMemo } from "react";
import clsx from "clsx";

import { getCompareSelectionStatus } from "@/lib/stockPresentation";
import { useStockStore } from "@/store/useStockStore";
import { SortKey, StockFilters } from "@/types/stock";

const SORT_LABELS: Record<SortKey, string> = {
  score_desc: "本命度順",
  price_asc: "株価昇順",
  price_desc: "株価降順",
  revenue_growth_desc: "売上成長率順",
  op_growth_desc: "営業利益成長率順"
};

const ACTION_LABELS: Record<Exclude<StockFilters["action"], "all">, string> = {
  buy_now: "今買う",
  wait_earnings: "決算待ち",
  wait_pullback: "押し目待ち",
  exclude: "除外"
};

interface FilterPanelProps {
  filters: StockFilters;
  sectors: string[];
  sortKey: SortKey;
  watchCount?: number;
  onChange: (patch: Partial<StockFilters>) => void;
  onSortChange: (sortKey: SortKey) => void;
  onReset: () => void;
}

function toNumberOrNull(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold font-semibolduppercase tracking-[0.2em] text-text-muted">{title}</p>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">{children}</div>
    </div>
  );
}

function FilterPanelInner({
  filters,
  sectors,
  sortKey,
  watchCount,
  onChange,
  onSortChange,
  onReset
}: FilterPanelProps): JSX.Element {
  const compareSelection = useStockStore((s) => s.compareSelection);
  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.priceMin != null) count++;
    if (filters.priceMax != null) count++;
    if (filters.sector !== "all") count++;
    if (filters.action !== "all") count++;
    if (filters.marketCapBand !== "all") count++;
    if (filters.revenueGrowthMin != null) count++;
    if (filters.opGrowthMin != null) count++;
    if (filters.operatingCFMin != null) count++;
    if (filters.dividend !== "all") count++;
    if (filters.perMax != null) count++;
    if (filters.pbrMax != null) count++;
    if (filters.watch !== "all") count++;
    return count;
  }, [filters]);
  const activeSummaries = useMemo(() => {
    const summaries = [`並び替え: ${SORT_LABELS[sortKey]}`];

    if (filters.priceMin != null || filters.priceMax != null) {
      summaries.push(`株価 ${filters.priceMin ?? 0}〜${filters.priceMax ?? "上限なし"}`);
    }
    if (filters.sector !== "all") summaries.push(`業態: ${filters.sector}`);
    if (filters.action !== "all") summaries.push(`判定: ${ACTION_LABELS[filters.action]}`);
    if (filters.marketCapBand !== "all") {
      summaries.push(
        filters.marketCapBand === "small"
          ? "小型株"
          : filters.marketCapBand === "mid"
            ? "中型株"
            : "大型株"
      );
    }
    if (filters.revenueGrowthMin != null) summaries.push(`売上成長 ${filters.revenueGrowthMin}%〜`);
    if (filters.opGrowthMin != null) summaries.push(`営業利益成長 ${filters.opGrowthMin}%〜`);
    if (filters.operatingCFMin != null) summaries.push(`営業CF ${filters.operatingCFMin.toLocaleString("ja-JP")}〜`);
    if (filters.dividend !== "all") summaries.push(filters.dividend === "with" ? "配当あり" : "配当なし");
    if (filters.perMax != null) summaries.push(`PER ≤ ${filters.perMax}`);
    if (filters.pbrMax != null) summaries.push(`PBR ≤ ${filters.pbrMax}`);
    if (filters.watch !== "all") summaries.push(filters.watch === "watching" ? "監視中のみ" : "未監視のみ");

    return summaries;
  }, [filters, sortKey]);
  const compareStatus = useMemo(() => getCompareSelectionStatus(compareSelection), [compareSelection]);

  return (
    <section className="rounded-lg border border-glass-border bg-panel p-4 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-text-primary">絞り込み</h2>
          {activeCount > 0 && (
            <span className="rounded-lg bg-secondary/20 px-2 py-0.5 text-[10px] font-bold text-secondary">
              {activeCount}
            </span>
          )}
          {watchCount != null && (
            <span className="rounded-lg bg-amber/15 px-2 py-0.5 text-[10px] font-bold text-amber">
              監視 {watchCount}
            </span>
          )}
          <span
            className={clsx(
              "rounded-lg px-2 py-0.5 text-[10px] font-bold",
              compareStatus.isFull ? "bg-amber/15 text-amber" : "bg-canvas-deep/70 text-text-secondary"
            )}
          >
            比較 {compareStatus.count}/{compareStatus.limit}
          </span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-slate-500 hover:text-slate-200"
        >
          リセット
        </button>
      </div>
      {compareStatus.isFull ? (
        <p className="mb-3 rounded-lg border border-amber/25 bg-amber/5 px-3 py-1.5 text-[11px] text-amber">
          比較は最大{compareStatus.limit}銘柄です。入れ替えるには比較パネルまたはランキングから外してください。
        </p>
      ) : null}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 xl:hidden">
        {activeSummaries.map((summary, index) => (
          <span
            key={`${summary}-${index}`}
            className={clsx(
              "whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px]",
              index === 0
                ? "border-secondary/35 bg-secondary/10 text-secondary"
                : "border-border-subtle bg-canvas-deep/50 text-text-secondary"
            )}
          >
            {summary}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <FilterGroup title="価格・バリュエーション">
          <label className="filter-field">
            <span>株価 下限</span>
            <input
              type="number"
              value={filters.priceMin ?? ""}
              onChange={(e) => onChange({ priceMin: toNumberOrNull(e.target.value) })}
              placeholder="0"
              className={clsx(filters.priceMin != null && "!border-primary/30")}
            />
          </label>
          <label className="filter-field">
            <span>株価 上限</span>
            <input
              type="number"
              value={filters.priceMax ?? ""}
              onChange={(e) => onChange({ priceMax: toNumberOrNull(e.target.value) })}
              placeholder="1000"
              className={clsx(filters.priceMax != null && "!border-primary/30")}
            />
          </label>
          <label className="filter-field">
            <span>PER 上限</span>
            <input
              type="number"
              value={filters.perMax ?? ""}
              onChange={(e) => onChange({ perMax: toNumberOrNull(e.target.value) })}
              placeholder="30"
              className={clsx(filters.perMax != null && "!border-primary/30")}
            />
          </label>
          <label className="filter-field">
            <span>PBR 上限</span>
            <input
              type="number"
              value={filters.pbrMax ?? ""}
              onChange={(e) => onChange({ pbrMax: toNumberOrNull(e.target.value) })}
              placeholder="3"
              className={clsx(filters.pbrMax != null && "!border-primary/30")}
            />
          </label>
        </FilterGroup>

        <FilterGroup title="成長指標">
          <label className="filter-field">
            <span>売上成長率 下限</span>
            <input
              type="number"
              value={filters.revenueGrowthMin ?? ""}
              onChange={(e) => onChange({ revenueGrowthMin: toNumberOrNull(e.target.value) })}
              placeholder="15"
              className={clsx(filters.revenueGrowthMin != null && "!border-primary/30")}
            />
          </label>
          <label className="filter-field">
            <span>営業利益成長率 下限</span>
            <input
              type="number"
              value={filters.opGrowthMin ?? ""}
              onChange={(e) => onChange({ opGrowthMin: toNumberOrNull(e.target.value) })}
              placeholder="15"
              className={clsx(filters.opGrowthMin != null && "!border-primary/30")}
            />
          </label>
          <label className="filter-field">
            <span>営業CF 下限</span>
            <input
              type="number"
              value={filters.operatingCFMin ?? ""}
              onChange={(e) => onChange({ operatingCFMin: toNumberOrNull(e.target.value) })}
              placeholder="0"
              className={clsx(filters.operatingCFMin != null && "!border-primary/30")}
            />
          </label>
          <label className="filter-field">
            <span>配当</span>
            <select value={filters.dividend} onChange={(e) => onChange({ dividend: e.target.value as StockFilters["dividend"] })}
              className={clsx(filters.dividend !== "all" && "!border-primary/30")}>
              <option value="all">すべて</option>
              <option value="with">配当あり</option>
              <option value="without">配当なし</option>
            </select>
          </label>
        </FilterGroup>

        <FilterGroup title="分類">
          <label className="filter-field">
            <span>業態</span>
            <select value={filters.sector} onChange={(e) => onChange({ sector: e.target.value })}
              className={clsx(filters.sector !== "all" && "!border-primary/30")}>
              {sectors.map((sector) => (
                <option key={sector} value={sector}>
                  {sector === "all" ? "すべて" : sector}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>アクション</span>
            <select value={filters.action} onChange={(e) => onChange({ action: e.target.value as StockFilters["action"] })}
              className={clsx(filters.action !== "all" && "!border-primary/30")}>
              <option value="all">すべて</option>
              <option value="buy_now">今買う</option>
              <option value="wait_earnings">決算待ち</option>
              <option value="wait_pullback">押し目待ち</option>
              <option value="exclude">除外</option>
            </select>
          </label>
          <label className="filter-field">
            <span>時価総額帯</span>
            <select value={filters.marketCapBand} onChange={(e) => onChange({ marketCapBand: e.target.value as StockFilters["marketCapBand"] })}
              className={clsx(filters.marketCapBand !== "all" && "!border-primary/30")}>
              <option value="all">すべて</option>
              <option value="small">小型 (&lt; 3000億円)</option>
              <option value="mid">中型 (3000億〜7000億円)</option>
              <option value="large">大型 (7000億円以上)</option>
            </select>
          </label>
          <label className="filter-field">
            <span>監視状態</span>
            <select value={filters.watch} onChange={(e) => onChange({ watch: e.target.value as StockFilters["watch"] })}
              className={clsx(filters.watch !== "all" && "!border-primary/30")}>
              <option value="all">すべて</option>
              <option value="watching">監視中のみ</option>
              <option value="not_watching">未監視のみ</option>
            </select>
          </label>
        </FilterGroup>

        <FilterGroup title="表示">
          <label className="filter-field md:col-span-2">
            <span>並び替え</span>
            <select value={sortKey} onChange={(e) => onSortChange(e.target.value as SortKey)}>
              <option value="score_desc">本命度順</option>
              <option value="price_asc">株価昇順</option>
              <option value="price_desc">株価降順</option>
              <option value="revenue_growth_desc">売上成長率順</option>
              <option value="op_growth_desc">営業利益成長率順</option>
            </select>
          </label>
        </FilterGroup>
      </div>
    </section>
  );
}

export const FilterPanel = React.memo(FilterPanelInner);

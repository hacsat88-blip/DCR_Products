"use client";

import React, { Suspense } from "react";

import { DecisionBoard } from "@/components/dashboard/DecisionBoard";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { NikkeiCandlestickChart } from "@/components/dashboard/NikkeiCandlestickChart";
import { RankingBoard } from "@/components/dashboard/RankingBoard";
import { BenchmarkChart } from "@/components/dashboard/BenchmarkChart";
import { NikkeiTrendChart } from "@/components/dashboard/NikkeiTrendChart";
import { FilterPanel } from "@/components/screener/FilterPanel";
import { SearchBar } from "@/components/screener/SearchBar";
import { StockGrid } from "@/components/stock/StockGrid";
import { SkeletonCard } from "@/components/ui/Skeleton";

import type { IsPanelInTab } from "./types";

interface MarketTabSectionProps {
  isPanelInTab: IsPanelInTab;
  filters: React.ComponentProps<typeof FilterPanel>["filters"];
  stocks: React.ComponentProps<typeof SearchBar>["registeredStocks"];
  sectors: React.ComponentProps<typeof FilterPanel>["sectors"];
  sortKey: React.ComponentProps<typeof FilterPanel>["sortKey"];
  rankingSortKey: React.ComponentProps<typeof RankingBoard>["rankingSortKey"];
  alertEvents: React.ComponentProps<typeof RankingBoard>["alertEvents"];
  compareSelection: React.ComponentProps<typeof RankingBoard>["compareSelection"];
  rankedRows: React.ComponentProps<typeof RankingBoard>["rows"];
  filteredStocks: React.ComponentProps<typeof StockGrid>["stocks"];
  selectedIdForGrid: React.ComponentProps<typeof StockGrid>["selectedId"];
  isLoading: boolean;
  safeManagerIndex: React.ComponentProps<typeof KpiCards>["managerIndex"];
  benchmarkIndex: React.ComponentProps<typeof KpiCards>["benchmarkIndex"];
  watchCount: React.ComponentProps<typeof KpiCards>["watchCount"];
  holdingsCount: React.ComponentProps<typeof KpiCards>["holdingsCount"];
  managerSeries: React.ComponentProps<typeof KpiCards>["managerSeries"];
  benchmarkSeries: React.ComponentProps<typeof KpiCards>["benchmarkSeries"];
  nikkei: React.ComponentProps<typeof KpiCards>["nikkei"];
  lastUpdatedAt: string | null;
  onSetFilters: React.ComponentProps<typeof FilterPanel>["onChange"];
  onRegisterSearchedStock: React.ComponentProps<typeof SearchBar>["onRegister"];
  onSetSortKey: React.ComponentProps<typeof FilterPanel>["onSortChange"];
  onResetFilters: React.ComponentProps<typeof FilterPanel>["onReset"];
  onSetRankingSortKey: React.ComponentProps<typeof RankingBoard>["onRankingSortChange"];
  onAddToCompare: React.ComponentProps<typeof RankingBoard>["onAddToCompare"];
  onRemoveFromCompare: React.ComponentProps<typeof RankingBoard>["onRemoveFromCompare"];
  onOpenDetail: React.ComponentProps<typeof RankingBoard>["onOpenDetail"];
  onExportRankingCsv: React.ComponentProps<typeof RankingBoard>["onExportCsv"];
  onToggleWatch: React.ComponentProps<typeof StockGrid>["onToggleWatch"];
  onRemoveRegisteredStock: React.ComponentProps<typeof StockGrid>["onRemove"];
}

export function MarketTabSection({
  isPanelInTab,
  filters,
  stocks,
  sectors,
  sortKey,
  rankingSortKey,
  alertEvents,
  compareSelection,
  rankedRows,
  filteredStocks,
  selectedIdForGrid,
  isLoading,
  safeManagerIndex,
  benchmarkIndex,
  watchCount,
  holdingsCount,
  managerSeries,
  benchmarkSeries,
  nikkei,
  lastUpdatedAt,
  onSetFilters,
  onRegisterSearchedStock,
  onSetSortKey,
  onResetFilters,
  onSetRankingSortKey,
  onAddToCompare,
  onRemoveFromCompare,
  onOpenDetail,
  onExportRankingCsv,
  onToggleWatch,
  onRemoveRegisteredStock
}: MarketTabSectionProps): JSX.Element {
  return (
    <div
      role="tabpanel"
      id="tabpanel-market"
      aria-labelledby="tab-market"
      className="flex flex-col gap-5 animate-fade-in"
    >
      <SearchBar
        value={filters.query}
        registeredStocks={stocks}
        onChange={(value) => onSetFilters({ query: value })}
        onRegister={onRegisterSearchedStock}
      />

      <FilterPanel
        filters={filters}
        sectors={sectors}
        sortKey={sortKey}
        onChange={onSetFilters}
        onSortChange={onSetSortKey}
        onReset={onResetFilters}
      />

      {isPanelInTab("ranking", "market") && (
        <RankingBoard
          rows={rankedRows}
          rankingSortKey={rankingSortKey}
          onRankingSortChange={onSetRankingSortKey}
          alertEvents={alertEvents}
          compareSelection={compareSelection}
          onAddToCompare={onAddToCompare}
          onRemoveFromCompare={onRemoveFromCompare}
          onOpenDetail={onOpenDetail}
          onExportCsv={onExportRankingCsv}
        />
      )}

      <section className="rounded-xl border border-border-subtle bg-panel p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text-primary">銘柄一覧</h2>
          <p className="text-xs text-text-secondary">
            表示件数: <span className="font-mono tabular-nums">{filteredStocks.length}</span>
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <StockGrid
            stocks={filteredStocks}
            selectedId={selectedIdForGrid}
            onSelect={(stockId) => onOpenDetail(stockId)}
            onToggleWatch={onToggleWatch}
            onRemove={onRemoveRegisteredStock}
          />
        )}
      </section>

      <DecisionBoard stocks={stocks} alertEvents={alertEvents} onRemove={onRemoveRegisteredStock} />

      <KpiCards
        managerIndex={safeManagerIndex}
        benchmarkIndex={benchmarkIndex}
        excessReturn={safeManagerIndex - benchmarkIndex}
        totalCount={filteredStocks.length}
        watchCount={watchCount}
        holdingsCount={holdingsCount}
        stocks={stocks}
        managerSeries={managerSeries}
        benchmarkSeries={benchmarkSeries}
        nikkei={nikkei}
      />

      <NikkeiCandlestickChart lastUpdatedAt={lastUpdatedAt} />

      <Suspense fallback={<SkeletonCard />}>
        <NikkeiTrendChart lastUpdatedAt={lastUpdatedAt} />
      </Suspense>

      <Suspense fallback={<SkeletonCard />}>
        <BenchmarkChart stocks={stocks} />
      </Suspense>
    </div>
  );
}

"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { AlertCenter } from "@/components/alerts/AlertCenter";
import { AlertToastStack } from "@/components/alerts/AlertToastStack";
import { RuleManager } from "@/components/alerts/RuleManager";
import { Header } from "@/components/common/Header";
import { CollapseSimulatorPanel } from "@/components/dashboard/CollapseSimulatorPanel";
import { ContrarianPanel } from "@/components/dashboard/ContrarianPanel";
import { DataSourceInfoPanel } from "@/components/dashboard/DataSourceInfoPanel";
import { DataQualityRibbon } from "@/components/dashboard/DataQualityRibbon";
import { DecisionBoard } from "@/components/dashboard/DecisionBoard";
import { ExportPanel } from "@/components/dashboard/ExportPanel";
import { ImportPanel } from "@/components/dashboard/ImportPanel";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { NikkeiCandlestickChart } from "@/components/dashboard/NikkeiCandlestickChart";
import { RankingBoard } from "@/components/dashboard/RankingBoard";
import { SavedScreenPanel } from "@/components/dashboard/SavedScreenPanel";
import { ScoreTuningPanel } from "@/components/dashboard/ScoreTuningPanel";
import { StatusBar } from "@/components/dashboard/StatusBar";
import { StockOnboardingPanel } from "@/components/dashboard/StockOnboardingPanel";
import { SummaryBar } from "@/components/dashboard/SummaryBar";
import { NavigatorLaunchButton, NavigatorResultsPanel, NavigatorSetupModal } from "@/components/navigator";
import { FilterPanel } from "@/components/screener/FilterPanel";
import { SearchBar } from "@/components/screener/SearchBar";
import { StockGrid } from "@/components/stock/StockGrid";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useDashboardDerived } from "@/hooks/useDashboardDerived";
import { useMarketData } from "@/hooks/useMarketData";
import { useNikkei } from "@/hooks/useNikkei";
import { useStockStore } from "@/store/useStockStore";
import { initNavigatorStore } from "@/store/useNavigatorStore";

/* ── Lazy-loaded heavy panels (Recharts & collapsible sections) ── */
const BacktestPanel = React.lazy(() =>
  import("@/components/dashboard/BacktestPanel").then((m) => ({ default: m.BacktestPanel }))
);
const ComparePanel = React.lazy(() =>
  import("@/components/dashboard/ComparePanel").then((m) => ({ default: m.ComparePanel }))
);
const TimelinePanel = React.lazy(() =>
  import("@/components/dashboard/TimelinePanel").then((m) => ({ default: m.TimelinePanel }))
);
const MorningCheckPanel = React.lazy(() =>
  import("@/components/dashboard/MorningCheckPanel").then((m) => ({ default: m.MorningCheckPanel }))
);
const SnapshotPanel = React.lazy(() =>
  import("@/components/dashboard/SnapshotPanel").then((m) => ({ default: m.SnapshotPanel }))
);
const BenchmarkChart = React.lazy(() =>
  import("@/components/dashboard/BenchmarkChart").then((m) => ({ default: m.BenchmarkChart }))
);
const NikkeiTrendChart = React.lazy(() =>
  import("@/components/dashboard/NikkeiTrendChart").then((m) => ({ default: m.NikkeiTrendChart }))
);
const DecisionReviewPanel = React.lazy(() =>
  import("@/components/dashboard/DecisionReviewPanel").then((m) => ({ default: m.DecisionReviewPanel }))
);
const PortfolioPanel = React.lazy(() =>
  import("@/components/dashboard/PortfolioPanel").then((m) => ({ default: m.PortfolioPanel }))
);
const StockDetailDrawer = React.lazy(() =>
  import("@/components/stock/StockDetailDrawer").then((m) => ({ default: m.StockDetailDrawer }))
);

function LazyFallback(): JSX.Element {
  return (
    <div className="flex items-center justify-center rounded-lg border border-border-subtle bg-panel p-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-primary" />
    </div>
  );
}

/* ── Inline Tab Navigation ── */
type TabId = "market" | "portfolio" | "analysis" | "settings";
const TAB_ITEMS: { id: TabId; label: string; icon: string }[] = [
  { id: "market", label: "マーケット", icon: "📊" },
  { id: "portfolio", label: "ポートフォリオ", icon: "💼" },
  { id: "analysis", label: "分析", icon: "🔬" },
  { id: "settings", label: "設定", icon: "⚙️" },
];

const TabNav = React.memo(function TabNav({
  active,
  onChange,
  badges,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
  badges?: Partial<Record<TabId, number>>;
}) {
  return (
    <nav
      role="tablist"
      aria-label="メインナビゲーションタブ"
      className="sticky top-0 z-30 rounded-lg border border-border-subtle bg-canvas/90 backdrop-blur-md"
    >
      <div className="flex">
        {TAB_ITEMS.map((tab) => {
          const on = active === tab.id;
          const badge = badges?.[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={on}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={on ? 0 : -1}
              className={[
                "relative flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-[12px] font-medium tracking-wide transition-all duration-300",
                on
                  ? "text-primary"
                  : "text-text-muted hover:bg-white/5 hover:text-text-secondary",
              ].join(" ")}
            >
              <span className="text-base" aria-hidden="true">
                {tab.icon}
              </span>
              <span className="text-[11px] sm:text-xs">{tab.label}</span>
              {badge != null && badge > 0 && (
                <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-md bg-amber px-1 text-[10px] font-bold leading-none text-slate-900">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
              {on && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
});

export default function HomePage(): JSX.Element {
  /* ── Granular Zustand selectors (avoid subscribing to entire store) ── */
  const stocks = useStockStore((s) => s.stocks);
  const filters = useStockStore((s) => s.filters);
  const sortKey = useStockStore((s) => s.sortKey);
  const rankingSortKey = useStockStore((s) => s.rankingSortKey);
  const detailOpen = useStockStore((s) => s.detailOpen);
  const fallbackStartedAt = useStockStore((s) => s.fallbackStartedAt);
  const fallbackReason = useStockStore((s) => s.fallbackReason);
  const alertRules = useStockStore((s) => s.alertRules);
  const alertEvents = useStockStore((s) => s.alertEvents);
  const lastEvaluationAt = useStockStore((s) => s.lastEvaluationAt);
  const notificationsEnabled = useStockStore((s) => s.notificationsEnabled);
  const notificationsAvailable = useStockStore((s) => s.notificationsAvailable);
  const notificationPermission = useStockStore((s) => s.notificationPermission);
  const scoringConfig = useStockStore((s) => s.scoringConfig);
  const backtestResults = useStockStore((s) => s.backtestResults);
  const snapshots = useStockStore((s) => s.snapshots);
  const savedScreens = useStockStore((s) => s.savedScreens);
  const compareSelection = useStockStore((s) => s.compareSelection);
  const autosaveSnapshots = useStockStore((s) => s.autosaveSnapshots);
  const holdingsMap = useStockStore((s) => s.holdingsMap);

  /* ── Actions (stable references, won't trigger re-renders) ── */
  const initialize = useStockStore((s) => s.initialize);
  const registerSearchedStock = useStockStore((s) => s.registerSearchedStock);
  const removeRegisteredStock = useStockStore((s) => s.removeRegisteredStock);
  const setFilters = useStockStore((s) => s.setFilters);
  const setSortKey = useStockStore((s) => s.setSortKey);
  const setRankingSortKey = useStockStore((s) => s.setRankingSortKey);
  const resetFilters = useStockStore((s) => s.resetFilters);
  const openDetail = useStockStore((s) => s.openDetail);
  const closeDetail = useStockStore((s) => s.closeDetail);
  const toggleWatch = useStockStore((s) => s.toggleWatch);
  const saveMemo = useStockStore((s) => s.saveMemo);
  const saveHypothesis = useStockStore((s) => s.saveHypothesis);
  const addRule = useStockStore((s) => s.addRule);
  const updateRule = useStockStore((s) => s.updateRule);
  const deleteRule = useStockStore((s) => s.deleteRule);
  const addPresetRules = useStockStore((s) => s.addPresetRules);
  const markAlertRead = useStockStore((s) => s.markAlertRead);
  const dismissAlert = useStockStore((s) => s.dismissAlert);
  const clearAlerts = useStockStore((s) => s.clearAlerts);
  const toggleNotifications = useStockStore((s) => s.toggleNotifications);
  const setScoringConfig = useStockStore((s) => s.setScoringConfig);
  const resetScoringConfig = useStockStore((s) => s.resetScoringConfig);
  const runBacktest = useStockStore((s) => s.runBacktest);
  const clearBacktestResults = useStockStore((s) => s.clearBacktestResults);
  const saveCurrentSnapshots = useStockStore((s) => s.saveCurrentSnapshots);
  const deleteSnapshotCapture = useStockStore((s) => s.deleteSnapshotCapture);
  const clearSnapshots = useStockStore((s) => s.clearSnapshots);
  const setAutosaveSnapshots = useStockStore((s) => s.setAutosaveSnapshots);
  const addToCompare = useStockStore((s) => s.addToCompare);
  const removeFromCompare = useStockStore((s) => s.removeFromCompare);
  const clearCompare = useStockStore((s) => s.clearCompare);
  const saveScreen = useStockStore((s) => s.saveScreen);
  const updateSavedScreen = useStockStore((s) => s.updateSavedScreen);
  const deleteSavedScreen = useStockStore((s) => s.deleteSavedScreen);
  const applySavedScreen = useStockStore((s) => s.applySavedScreen);
  const exportData = useStockStore((s) => s.exportData);
  const exportSnapshotsCsv = useStockStore((s) => s.exportSnapshotsCsv);
  const exportRankingCsv = useStockStore((s) => s.exportRankingCsv);
  const exportPortfolioCsv = useStockStore((s) => s.exportPortfolioCsv);
  const [marketDataEnabled, setMarketDataEnabled] = useState(false);
  const {
    loading: isLoading,
    error,
    lastUpdated: lastUpdatedAt,
    dataMode,
    sourceMeta,
    health,
    refresh: refreshMarketData
  } = useMarketData({ enabled: marketDataEnabled, refreshIntervalMs: 5 * 60 * 1000 });

  const handleRemoveRegisteredStock = useCallback(
    (stockCode: string): void => {
      const result = removeRegisteredStock(stockCode);
      if (result.ok) {
        return;
      }
      if (typeof window !== "undefined" && typeof window.alert === "function") {
        window.alert("銘柄削除に失敗しました。");
      }
    },
    [removeRegisteredStock]
  );

  useEffect(() => {
    let mounted = true;
    initNavigatorStore();
    void initialize().finally(() => {
      if (mounted) {
        setMarketDataEnabled(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, [initialize]);

  /* ── Tab state ── */
  const [activeTab, setActiveTab] = useState<TabId>("market");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        const map: Record<string, TabId> = { "1": "market", "2": "portfolio", "3": "analysis", "4": "settings" };
        const tab = map[e.key];
        if (tab) { e.preventDefault(); setActiveTab(tab); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const nikkei = useNikkei(lastUpdatedAt);

  const {
    sectors,
    filteredStocks,
    drawerStock,
    selectedIdForGrid,
    selectedStock,
    selectedInFiltered,
    benchmarkIndex,
    safeManagerIndex,
    watchCount,
    managerSeries,
    benchmarkSeries,
    selectedBacktestResult,
    selectedHypothesis,
    isStale,
    rankedRows
  } = useDashboardDerived();

  const unreadAlertCount = useMemo(
    () => alertEvents.filter((e) => !e.read && !e.dismissed).length,
    [alertEvents]
  );

  const holdingsCount = useMemo(
    () => Object.values(holdingsMap).filter((v) => v > 0).length,
    [holdingsMap]
  );

  const exportRankedCsv = useCallback(
    () => exportRankingCsv(rankedRows),
    [exportRankingCsv, rankedRows]
  );

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-5 px-3 py-4 pb-24 md:px-6 md:py-6">
      <Header
        unreadAlerts={unreadAlertCount}
        notificationsEnabled={notificationsEnabled}
        notificationsAvailable={notificationsAvailable}
        notificationPermission={notificationPermission}
        dataMode={dataMode}
        sourceMeta={sourceMeta}
        health={health}
        error={error}
      />

      <DataQualityRibbon
        dataMode={dataMode}
        sourceMeta={sourceMeta}
        lastUpdatedAt={lastUpdatedAt}
        health={health}
        isStale={isStale}
        autoRefreshEnabled={marketDataEnabled}
        refreshIntervalMinutes={5}
      />

      <StatusBar
        dataMode={dataMode}
        sourceMeta={sourceMeta}
        health={health}
        error={error}
        stockCount={stocks.length}
        lastUpdatedAt={lastUpdatedAt}
        isLoading={isLoading}
        onRefresh={refreshMarketData}
      />

      <TabNav
        active={activeTab}
        onChange={setActiveTab}
        badges={{ market: unreadAlertCount, portfolio: holdingsCount }}
      />

      {/* ── マーケット tab ── */}
      {activeTab === "market" && (
        <div
          role="tabpanel"
          id="tabpanel-market"
          aria-labelledby="tab-market"
          className="flex flex-col gap-5 animate-fade-in"
        >
          {/* ── AI Navigator launch + results ── */}
          <div className="flex items-center gap-4">
            <NavigatorLaunchButton />
          </div>

          <NavigatorResultsPanel />

          <SearchBar
            value={filters.query}
            registeredStocks={stocks}
            onChange={(value) => setFilters({ query: value })}
            onRegister={registerSearchedStock}
          />

          <FilterPanel
            filters={filters}
            sectors={sectors}
            sortKey={sortKey}
            onChange={setFilters}
            onSortChange={setSortKey}
            onReset={resetFilters}
          />

          <RankingBoard
            rows={rankedRows}
            rankingSortKey={rankingSortKey}
            onRankingSortChange={setRankingSortKey}
            alertEvents={alertEvents}
            compareSelection={compareSelection}
            onAddToCompare={addToCompare}
            onRemoveFromCompare={removeFromCompare}
            onOpenDetail={openDetail}
            onExportCsv={exportRankingCsv}
          />

          <section className="rounded-xl border border-border-subtle bg-panel p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-text-primary">銘柄一覧</h2>
              <p className="text-xs text-text-secondary">表示件数: <span className="font-mono tabular-nums">{filteredStocks.length}</span></p>
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
                onSelect={(stockId) => openDetail(stockId)}
                onToggleWatch={toggleWatch}
                onRemove={handleRemoveRegisteredStock}
              />
            )}
          </section>

          <DecisionBoard
            stocks={stocks}
            alertEvents={alertEvents}
            onRemove={handleRemoveRegisteredStock}
          />

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
      )}

      {/* ── ポートフォリオ tab ── */}
      {activeTab === "portfolio" && (
        <div
          role="tabpanel"
          id="tabpanel-portfolio"
          aria-labelledby="tab-portfolio"
          className="flex flex-col gap-5 animate-fade-in"
        >
          <Suspense fallback={<LazyFallback />}>
            <PortfolioPanel />
          </Suspense>

          <ExportPanel
            onExportJson={exportData}
            onExportSnapshotsCsv={exportSnapshotsCsv}
            onExportRankingCsv={exportRankedCsv}
            onExportPortfolioCsv={exportPortfolioCsv}
            preview={{
              snapshotCount: snapshots.length,
              alertEventCount: alertEvents.length,
              savedScreenCount: savedScreens.length,
              backtestResultCount: backtestResults.length,
              holdingsCount: holdingsCount
            }}
          />

          <ImportPanel />
        </div>
      )}

      {/* ── 分析 tab ── */}
      {activeTab === "analysis" && (
        <div
          role="tabpanel"
          id="tabpanel-analysis"
          aria-labelledby="tab-analysis"
          className="flex flex-col gap-5 animate-fade-in"
        >
          <Suspense fallback={<LazyFallback />}>
            <SnapshotPanel
              snapshots={snapshots}
              autosaveSnapshots={autosaveSnapshots}
              onSave={saveCurrentSnapshots}
              onToggleAutosave={setAutosaveSnapshots}
              onDeleteCapture={deleteSnapshotCapture}
              onClear={clearSnapshots}
            />
          </Suspense>

          <Suspense fallback={<LazyFallback />}>
            <MorningCheckPanel stocks={stocks} snapshots={snapshots} />
          </Suspense>

          <Suspense fallback={<LazyFallback />}>
            <BacktestPanel
              stocks={stocks}
              results={backtestResults}
              onRunBacktest={runBacktest}
              onClearResults={clearBacktestResults}
            />
          </Suspense>

          <Suspense fallback={<LazyFallback />}>
            <TimelinePanel stock={selectedStock} snapshots={snapshots} />
          </Suspense>

          <Suspense fallback={<LazyFallback />}>
            <ComparePanel
              stocks={stocks}
              compareSelection={compareSelection}
              onRemove={removeFromCompare}
              onClear={clearCompare}
              onOpenDetail={openDetail}
            />
          </Suspense>

          <Suspense fallback={<LazyFallback />}>
            <DecisionReviewPanel
              stock={selectedStock}
              alerts={alertEvents}
              backtestResult={selectedBacktestResult}
            />
          </Suspense>

          <CollapseSimulatorPanel stock={selectedStock} scoringConfig={scoringConfig} />

          <ContrarianPanel stock={selectedStock} />
        </div>
      )}

      {/* ── 設定 tab ── */}
      {activeTab === "settings" && (
        <div
          role="tabpanel"
          id="tabpanel-settings"
          aria-labelledby="tab-settings"
          className="flex flex-col gap-5 animate-fade-in"
        >
          <SummaryBar
            stocks={filteredStocks}
            dataMode={dataMode}
            sourceMeta={sourceMeta}
            lastUpdatedAt={lastUpdatedAt}
            fallbackStartedAt={fallbackStartedAt}
            isLoading={isLoading}
            isStale={isStale}
            error={error}
            fallbackReason={fallbackReason}
            health={health}
            onRefresh={refreshMarketData}
          />

          <DataSourceInfoPanel health={health} />

          <ScoreTuningPanel
            config={scoringConfig}
            onChange={setScoringConfig}
            onReset={resetScoringConfig}
          />

          <SavedScreenPanel
            filters={filters}
            sortKey={sortKey}
            rankingSortKey={rankingSortKey}
            compareCount={compareSelection.length}
            savedScreens={savedScreens}
            onSave={saveScreen}
            onUpdate={updateSavedScreen}
            onDelete={deleteSavedScreen}
            onApply={applySavedScreen}
          />

          <StockOnboardingPanel />

          <RuleManager
            rules={alertRules}
            stocks={stocks}
            notificationsEnabled={notificationsEnabled}
            notificationsAvailable={notificationsAvailable}
            notificationPermission={notificationPermission}
            onAddRule={addRule}
            onUpdateRule={updateRule}
            onDeleteRule={deleteRule}
            onAddPreset={addPresetRules}
            onToggleNotifications={toggleNotifications}
          />

          <AlertCenter
            events={alertEvents}
            stocks={stocks}
            lastEvaluationAt={lastEvaluationAt}
            onMarkRead={markAlertRead}
            onDismiss={dismissAlert}
            onClear={clearAlerts}
          />
        </div>
      )}

      <Suspense fallback={null}>
        <StockDetailDrawer
          stock={drawerStock}
          hypothesis={selectedHypothesis}
          open={detailOpen}
          hiddenByFilter={detailOpen && Boolean(selectedStock) && !selectedInFiltered}
          onClose={closeDetail}
          onToggleWatch={toggleWatch}
          onSaveMemo={saveMemo}
          onSaveHypothesis={saveHypothesis}
        />
      </Suspense>

      <AlertToastStack events={alertEvents} onDismiss={dismissAlert} />

      {/* ── AI Navigator modal (portal-style, renders at page level) ── */}
      <NavigatorSetupModal />
    </main>
  );
}

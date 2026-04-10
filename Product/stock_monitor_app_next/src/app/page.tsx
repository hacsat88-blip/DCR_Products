"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { AlertToastStack } from "@/components/alerts/AlertToastStack";
import { Header } from "@/components/common/Header";
import { DataQualityRibbon } from "@/components/dashboard/DataQualityRibbon";
import { StatusBar } from "@/components/dashboard/StatusBar";
import { AnalysisTabSection } from "@/components/dashboard/home/AnalysisTabSection";
import { MarketTabSection } from "@/components/dashboard/home/MarketTabSection";
import { PortfolioTabSection } from "@/components/dashboard/home/PortfolioTabSection";
import { SettingsTabSection } from "@/components/dashboard/home/SettingsTabSection";
import type { DashboardPanelId, TabId } from "@/components/dashboard/home/types";
import { NavigatorSetupModal } from "@/components/navigator";
import { AnimatePresence, motion, fadeUpVariants } from "@/components/ui/MotionPrimitives";
import { useDashboardDerived } from "@/hooks/useDashboardDerived";
import { useHomePageStoreSelectors } from "@/hooks/useHomePageStoreSelectors";
import { useMarketData } from "@/hooks/useMarketData";
import { useNikkei } from "@/hooks/useNikkei";
import { initNavigatorStore } from "@/store/useNavigatorStore";

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

const TAB_ITEMS: { id: TabId; label: string; icon: string }[] = [
  { id: "market", label: "マーケット", icon: "📊" },
  { id: "portfolio", label: "ポートフォリオ", icon: "💼" },
  { id: "analysis", label: "AI Navigator", icon: "🤖" },
  { id: "settings", label: "設定", icon: "⚙️" }
];

const TabNav = React.memo(function TabNav({
  active,
  onChange,
  badges
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
                on ? "text-primary" : "text-text-muted hover:bg-white/5 hover:text-text-secondary"
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
                <motion.span
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
});

export default function HomePage(): JSX.Element {
  const { marketState, alertState, analysisState, marketActions, alertActions, analysisActions, archiveActions } =
    useHomePageStoreSelectors();
  const {
    initialize,
    registerSearchedStock,
    removeRegisteredStock,
    setFilters,
    setSortKey,
    setRankingSortKey,
    resetFilters,
    openDetail,
    closeDetail,
    toggleWatch,
    saveMemo,
    saveHypothesis,
    addToCompare,
    removeFromCompare,
    clearCompare
  } = marketActions;
  const { addRule, updateRule, deleteRule, addPresetRules, markAlertRead, dismissAlert, clearAlerts, toggleNotifications } =
    alertActions;
  const {
    setScoringConfig,
    resetScoringConfig,
    runBacktest,
    clearBacktestResults,
    saveCurrentSnapshots,
    deleteSnapshotCapture,
    clearSnapshots,
    setAutosaveSnapshots
  } = analysisActions;
  const {
    saveScreen,
    updateSavedScreen,
    deleteSavedScreen,
    applySavedScreen,
    exportData,
    exportSnapshotsCsv,
    exportRankingCsv,
    exportPortfolioCsv
  } = archiveActions;

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

  const [activeTab, setActiveTab] = useState<TabId>("market");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        const map: Record<string, TabId> = {
          "1": "market",
          "2": "portfolio",
          "3": "analysis",
          "4": "settings"
        };
        const tab = map[e.key];
        if (tab) {
          e.preventDefault();
          setActiveTab(tab);
        }
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
    rankedRows,
    dashboardPanels
  } = useDashboardDerived();

  const unreadAlertCount = useMemo(
    () => alertState.alertEvents.filter((e) => !e.read && !e.dismissed).length,
    [alertState.alertEvents]
  );

  const holdingsCount = useMemo(
    () => Object.values(marketState.holdingsMap).filter((v) => v > 0).length,
    [marketState.holdingsMap]
  );

  const exportRankedCsv = useCallback(
    () => exportRankingCsv(rankedRows),
    [exportRankingCsv, rankedRows]
  );

  const isPanelInTab = useCallback(
    (panel: DashboardPanelId, tab: TabId) => dashboardPanels[panel] === tab,
    [dashboardPanels]
  );

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-5 px-3 py-4 pb-24 md:px-6 md:py-6">
      <Header
        unreadAlerts={unreadAlertCount}
        notificationsEnabled={alertState.notificationsEnabled}
        notificationsAvailable={alertState.notificationsAvailable}
        notificationPermission={alertState.notificationPermission}
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
        stockCount={marketState.stocks.length}
        lastUpdatedAt={lastUpdatedAt}
        isLoading={isLoading}
        onRefresh={refreshMarketData}
      />

      <TabNav
        active={activeTab}
        onChange={setActiveTab}
        badges={{ market: unreadAlertCount, portfolio: holdingsCount }}
      />

      <AnimatePresence mode="wait">
        {activeTab === "market" && (
          <motion.div key="market" variants={fadeUpVariants} initial="hidden" animate="visible" exit="exit">
            <MarketTabSection
          isPanelInTab={isPanelInTab}
          filters={marketState.filters}
          stocks={marketState.stocks}
          sectors={sectors}
          sortKey={marketState.sortKey}
          rankingSortKey={marketState.rankingSortKey}
          alertEvents={alertState.alertEvents}
          compareSelection={marketState.compareSelection}
          rankedRows={rankedRows}
          filteredStocks={filteredStocks}
          selectedIdForGrid={selectedIdForGrid}
          isLoading={isLoading}
          safeManagerIndex={safeManagerIndex}
          benchmarkIndex={benchmarkIndex}
          watchCount={watchCount}
          holdingsCount={holdingsCount}
          managerSeries={managerSeries}
          benchmarkSeries={benchmarkSeries}
          nikkei={nikkei}
          lastUpdatedAt={lastUpdatedAt}
          onSetFilters={setFilters}
          onRegisterSearchedStock={registerSearchedStock}
          onSetSortKey={setSortKey}
          onResetFilters={resetFilters}
          onSetRankingSortKey={setRankingSortKey}
          onAddToCompare={addToCompare}
          onRemoveFromCompare={removeFromCompare}
          onOpenDetail={openDetail}
          onExportRankingCsv={exportRankingCsv}
          onToggleWatch={toggleWatch}
          onRemoveRegisteredStock={handleRemoveRegisteredStock}
        />
          </motion.div>
      )}

      {activeTab === "portfolio" && (
          <motion.div key="portfolio" variants={fadeUpVariants} initial="hidden" animate="visible" exit="exit">
        <PortfolioTabSection
          isPanelInTab={isPanelInTab}
          fallback={<LazyFallback />}
          onExportJson={exportData}
          onExportSnapshotsCsv={exportSnapshotsCsv}
          onExportRankingCsv={exportRankedCsv}
          onExportPortfolioCsv={exportPortfolioCsv}
          preview={{
            snapshotCount: analysisState.snapshots.length,
            alertEventCount: alertState.alertEvents.length,
            savedScreenCount: analysisState.savedScreens.length,
            backtestResultCount: analysisState.backtestResults.length,
            holdingsCount
          }}
        />
          </motion.div>
      )}

      {activeTab === "analysis" && (
          <motion.div key="analysis" variants={fadeUpVariants} initial="hidden" animate="visible" exit="exit">
        <AnalysisTabSection
          isPanelInTab={isPanelInTab}
          fallback={<LazyFallback />}
          stocks={marketState.stocks}
          snapshots={analysisState.snapshots}
          autosaveSnapshots={analysisState.autosaveSnapshots}
          selectedStock={selectedStock}
          selectedBacktestResult={selectedBacktestResult}
          alertEvents={alertState.alertEvents}
          compareSelection={marketState.compareSelection}
          scoringConfig={analysisState.scoringConfig}
          onSaveSnapshots={saveCurrentSnapshots}
          onToggleAutosave={setAutosaveSnapshots}
          onDeleteSnapshotCapture={deleteSnapshotCapture}
          onClearSnapshots={clearSnapshots}
          onRunBacktest={runBacktest}
          onClearBacktestResults={clearBacktestResults}
          backtestResults={analysisState.backtestResults}
          onRemoveFromCompare={removeFromCompare}
          onClearCompare={clearCompare}
          onOpenDetail={openDetail}
        />
          </motion.div>
      )}

      {activeTab === "settings" && (
          <motion.div key="settings" variants={fadeUpVariants} initial="hidden" animate="visible" exit="exit">
        <SettingsTabSection
          isPanelInTab={isPanelInTab}
          stocks={filteredStocks}
          allStocks={marketState.stocks}
          dataMode={dataMode}
          sourceMeta={sourceMeta}
          lastUpdatedAt={lastUpdatedAt}
          fallbackStartedAt={marketState.fallbackStartedAt}
          isLoading={isLoading}
          isStale={isStale}
          error={error}
          fallbackReason={marketState.fallbackReason}
          health={health}
          scoringConfig={analysisState.scoringConfig}
          filters={marketState.filters}
          sortKey={marketState.sortKey}
          rankingSortKey={marketState.rankingSortKey}
          compareCount={marketState.compareSelection.length}
          savedScreens={analysisState.savedScreens}
          alertRules={alertState.alertRules}
          alertEvents={alertState.alertEvents}
          lastEvaluationAt={alertState.lastEvaluationAt}
          notificationsEnabled={alertState.notificationsEnabled}
          notificationsAvailable={alertState.notificationsAvailable}
          notificationPermission={alertState.notificationPermission}
          onRefresh={refreshMarketData}
          onSetScoringConfig={setScoringConfig}
          onResetScoringConfig={resetScoringConfig}
          onSaveScreen={saveScreen}
          onUpdateSavedScreen={updateSavedScreen}
          onDeleteSavedScreen={deleteSavedScreen}
          onApplySavedScreen={applySavedScreen}
          onAddRule={addRule}
          onUpdateRule={updateRule}
          onDeleteRule={deleteRule}
          onAddPresetRules={addPresetRules}
          onToggleNotifications={toggleNotifications}
          onMarkAlertRead={markAlertRead}
          onDismissAlert={dismissAlert}
          onClearAlerts={clearAlerts}
        />
          </motion.div>
      )}
      </AnimatePresence>

      <Suspense fallback={null}>
        <StockDetailDrawer
          stock={drawerStock}
          hypothesis={selectedHypothesis}
          open={marketState.detailOpen}
          hiddenByFilter={marketState.detailOpen && Boolean(selectedStock) && !selectedInFiltered}
          onClose={closeDetail}
          onToggleWatch={toggleWatch}
          onSaveMemo={saveMemo}
          onSaveHypothesis={saveHypothesis}
        />
      </Suspense>

      <AlertToastStack events={alertState.alertEvents} onDismiss={dismissAlert} />
      <NavigatorSetupModal />
    </main>
  );
}

"use client";

import { useStockStore } from "@/store/useStockStore";

const marketStateSelectors = {
  stocks: (s: ReturnType<typeof useStockStore.getState>) => s.stocks,
  filters: (s: ReturnType<typeof useStockStore.getState>) => s.filters,
  sortKey: (s: ReturnType<typeof useStockStore.getState>) => s.sortKey,
  rankingSortKey: (s: ReturnType<typeof useStockStore.getState>) => s.rankingSortKey,
  detailOpen: (s: ReturnType<typeof useStockStore.getState>) => s.detailOpen,
  fallbackStartedAt: (s: ReturnType<typeof useStockStore.getState>) => s.fallbackStartedAt,
  fallbackReason: (s: ReturnType<typeof useStockStore.getState>) => s.fallbackReason,
  holdingsMap: (s: ReturnType<typeof useStockStore.getState>) => s.holdingsMap,
  compareSelection: (s: ReturnType<typeof useStockStore.getState>) => s.compareSelection
};

const alertStateSelectors = {
  alertRules: (s: ReturnType<typeof useStockStore.getState>) => s.alertRules,
  alertEvents: (s: ReturnType<typeof useStockStore.getState>) => s.alertEvents,
  lastEvaluationAt: (s: ReturnType<typeof useStockStore.getState>) => s.lastEvaluationAt,
  notificationsEnabled: (s: ReturnType<typeof useStockStore.getState>) => s.notificationsEnabled,
  notificationsAvailable: (s: ReturnType<typeof useStockStore.getState>) => s.notificationsAvailable,
  notificationPermission: (s: ReturnType<typeof useStockStore.getState>) => s.notificationPermission
};

const analysisStateSelectors = {
  scoringConfig: (s: ReturnType<typeof useStockStore.getState>) => s.scoringConfig,
  backtestResults: (s: ReturnType<typeof useStockStore.getState>) => s.backtestResults,
  snapshots: (s: ReturnType<typeof useStockStore.getState>) => s.snapshots,
  autosaveSnapshots: (s: ReturnType<typeof useStockStore.getState>) => s.autosaveSnapshots,
  savedScreens: (s: ReturnType<typeof useStockStore.getState>) => s.savedScreens
};

const marketActionSelectors = {
  initialize: (s: ReturnType<typeof useStockStore.getState>) => s.initialize,
  registerSearchedStock: (s: ReturnType<typeof useStockStore.getState>) => s.registerSearchedStock,
  removeRegisteredStock: (s: ReturnType<typeof useStockStore.getState>) => s.removeRegisteredStock,
  setFilters: (s: ReturnType<typeof useStockStore.getState>) => s.setFilters,
  setSortKey: (s: ReturnType<typeof useStockStore.getState>) => s.setSortKey,
  setRankingSortKey: (s: ReturnType<typeof useStockStore.getState>) => s.setRankingSortKey,
  resetFilters: (s: ReturnType<typeof useStockStore.getState>) => s.resetFilters,
  openDetail: (s: ReturnType<typeof useStockStore.getState>) => s.openDetail,
  closeDetail: (s: ReturnType<typeof useStockStore.getState>) => s.closeDetail,
  toggleWatch: (s: ReturnType<typeof useStockStore.getState>) => s.toggleWatch,
  saveMemo: (s: ReturnType<typeof useStockStore.getState>) => s.saveMemo,
  saveHypothesis: (s: ReturnType<typeof useStockStore.getState>) => s.saveHypothesis,
  addToCompare: (s: ReturnType<typeof useStockStore.getState>) => s.addToCompare,
  removeFromCompare: (s: ReturnType<typeof useStockStore.getState>) => s.removeFromCompare,
  clearCompare: (s: ReturnType<typeof useStockStore.getState>) => s.clearCompare
};

const alertActionSelectors = {
  addRule: (s: ReturnType<typeof useStockStore.getState>) => s.addRule,
  updateRule: (s: ReturnType<typeof useStockStore.getState>) => s.updateRule,
  deleteRule: (s: ReturnType<typeof useStockStore.getState>) => s.deleteRule,
  addPresetRules: (s: ReturnType<typeof useStockStore.getState>) => s.addPresetRules,
  markAlertRead: (s: ReturnType<typeof useStockStore.getState>) => s.markAlertRead,
  dismissAlert: (s: ReturnType<typeof useStockStore.getState>) => s.dismissAlert,
  clearAlerts: (s: ReturnType<typeof useStockStore.getState>) => s.clearAlerts,
  toggleNotifications: (s: ReturnType<typeof useStockStore.getState>) => s.toggleNotifications
};

const analysisActionSelectors = {
  setScoringConfig: (s: ReturnType<typeof useStockStore.getState>) => s.setScoringConfig,
  resetScoringConfig: (s: ReturnType<typeof useStockStore.getState>) => s.resetScoringConfig,
  runBacktest: (s: ReturnType<typeof useStockStore.getState>) => s.runBacktest,
  clearBacktestResults: (s: ReturnType<typeof useStockStore.getState>) => s.clearBacktestResults,
  saveCurrentSnapshots: (s: ReturnType<typeof useStockStore.getState>) => s.saveCurrentSnapshots,
  deleteSnapshotCapture: (s: ReturnType<typeof useStockStore.getState>) => s.deleteSnapshotCapture,
  clearSnapshots: (s: ReturnType<typeof useStockStore.getState>) => s.clearSnapshots,
  setAutosaveSnapshots: (s: ReturnType<typeof useStockStore.getState>) => s.setAutosaveSnapshots
};

const archiveActionSelectors = {
  saveScreen: (s: ReturnType<typeof useStockStore.getState>) => s.saveScreen,
  updateSavedScreen: (s: ReturnType<typeof useStockStore.getState>) => s.updateSavedScreen,
  deleteSavedScreen: (s: ReturnType<typeof useStockStore.getState>) => s.deleteSavedScreen,
  applySavedScreen: (s: ReturnType<typeof useStockStore.getState>) => s.applySavedScreen,
  exportData: (s: ReturnType<typeof useStockStore.getState>) => s.exportData,
  exportSnapshotsCsv: (s: ReturnType<typeof useStockStore.getState>) => s.exportSnapshotsCsv,
  exportRankingCsv: (s: ReturnType<typeof useStockStore.getState>) => s.exportRankingCsv,
  exportPortfolioCsv: (s: ReturnType<typeof useStockStore.getState>) => s.exportPortfolioCsv
};

export function useHomePageStoreSelectors() {
  const marketState = {
    stocks: useStockStore(marketStateSelectors.stocks),
    filters: useStockStore(marketStateSelectors.filters),
    sortKey: useStockStore(marketStateSelectors.sortKey),
    rankingSortKey: useStockStore(marketStateSelectors.rankingSortKey),
    detailOpen: useStockStore(marketStateSelectors.detailOpen),
    fallbackStartedAt: useStockStore(marketStateSelectors.fallbackStartedAt),
    fallbackReason: useStockStore(marketStateSelectors.fallbackReason),
    holdingsMap: useStockStore(marketStateSelectors.holdingsMap),
    compareSelection: useStockStore(marketStateSelectors.compareSelection)
  };

  const alertState = {
    alertRules: useStockStore(alertStateSelectors.alertRules),
    alertEvents: useStockStore(alertStateSelectors.alertEvents),
    lastEvaluationAt: useStockStore(alertStateSelectors.lastEvaluationAt),
    notificationsEnabled: useStockStore(alertStateSelectors.notificationsEnabled),
    notificationsAvailable: useStockStore(alertStateSelectors.notificationsAvailable),
    notificationPermission: useStockStore(alertStateSelectors.notificationPermission)
  };

  const analysisState = {
    scoringConfig: useStockStore(analysisStateSelectors.scoringConfig),
    backtestResults: useStockStore(analysisStateSelectors.backtestResults),
    snapshots: useStockStore(analysisStateSelectors.snapshots),
    autosaveSnapshots: useStockStore(analysisStateSelectors.autosaveSnapshots),
    savedScreens: useStockStore(analysisStateSelectors.savedScreens)
  };

  const marketActions = {
    initialize: useStockStore(marketActionSelectors.initialize),
    registerSearchedStock: useStockStore(marketActionSelectors.registerSearchedStock),
    removeRegisteredStock: useStockStore(marketActionSelectors.removeRegisteredStock),
    setFilters: useStockStore(marketActionSelectors.setFilters),
    setSortKey: useStockStore(marketActionSelectors.setSortKey),
    setRankingSortKey: useStockStore(marketActionSelectors.setRankingSortKey),
    resetFilters: useStockStore(marketActionSelectors.resetFilters),
    openDetail: useStockStore(marketActionSelectors.openDetail),
    closeDetail: useStockStore(marketActionSelectors.closeDetail),
    toggleWatch: useStockStore(marketActionSelectors.toggleWatch),
    saveMemo: useStockStore(marketActionSelectors.saveMemo),
    saveHypothesis: useStockStore(marketActionSelectors.saveHypothesis),
    addToCompare: useStockStore(marketActionSelectors.addToCompare),
    removeFromCompare: useStockStore(marketActionSelectors.removeFromCompare),
    clearCompare: useStockStore(marketActionSelectors.clearCompare)
  };

  const alertActions = {
    addRule: useStockStore(alertActionSelectors.addRule),
    updateRule: useStockStore(alertActionSelectors.updateRule),
    deleteRule: useStockStore(alertActionSelectors.deleteRule),
    addPresetRules: useStockStore(alertActionSelectors.addPresetRules),
    markAlertRead: useStockStore(alertActionSelectors.markAlertRead),
    dismissAlert: useStockStore(alertActionSelectors.dismissAlert),
    clearAlerts: useStockStore(alertActionSelectors.clearAlerts),
    toggleNotifications: useStockStore(alertActionSelectors.toggleNotifications)
  };

  const analysisActions = {
    setScoringConfig: useStockStore(analysisActionSelectors.setScoringConfig),
    resetScoringConfig: useStockStore(analysisActionSelectors.resetScoringConfig),
    runBacktest: useStockStore(analysisActionSelectors.runBacktest),
    clearBacktestResults: useStockStore(analysisActionSelectors.clearBacktestResults),
    saveCurrentSnapshots: useStockStore(analysisActionSelectors.saveCurrentSnapshots),
    deleteSnapshotCapture: useStockStore(analysisActionSelectors.deleteSnapshotCapture),
    clearSnapshots: useStockStore(analysisActionSelectors.clearSnapshots),
    setAutosaveSnapshots: useStockStore(analysisActionSelectors.setAutosaveSnapshots)
  };

  const archiveActions = {
    saveScreen: useStockStore(archiveActionSelectors.saveScreen),
    updateSavedScreen: useStockStore(archiveActionSelectors.updateSavedScreen),
    deleteSavedScreen: useStockStore(archiveActionSelectors.deleteSavedScreen),
    applySavedScreen: useStockStore(archiveActionSelectors.applySavedScreen),
    exportData: useStockStore(archiveActionSelectors.exportData),
    exportSnapshotsCsv: useStockStore(archiveActionSelectors.exportSnapshotsCsv),
    exportRankingCsv: useStockStore(archiveActionSelectors.exportRankingCsv),
    exportPortfolioCsv: useStockStore(archiveActionSelectors.exportPortfolioCsv)
  };

  return {
    marketState,
    alertState,
    analysisState,
    marketActions,
    alertActions,
    analysisActions,
    archiveActions
  };
}

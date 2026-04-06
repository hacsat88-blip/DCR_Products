"use client";

import { StateCreator } from "zustand";

import { DEFAULT_FILTERS } from "@/lib/filters";
import { DEFAULT_STOCK_CODES, DataMode, ProviderHealth } from "@/services/providers/types";
import { stockService } from "@/services/stockService";
import { EvaluatedStock, HypothesisLog, SortKey, StockFilters } from "@/types/stock";

import type { StoreState } from "./types";
import {
  evaluateStocks,
  normalizeRegisteredCodes,
  normalizeRegisteredNameMap,
  readJSON,
  writeJSON,
  notifyStorageFailure,
  WATCH_KEY,
  HOLDINGS_KEY,
  MEMO_KEY,
  HYPOTHESIS_KEY,
  REGISTERED_CODES_KEY,
  REGISTERED_NAME_MAP_KEY,
  REFRESH_INTERVAL_KEY,
  AUTO_REFRESH_KEY,
  initializeAlertStorage,
  initializeBacktestStorage,
  initializeArchiveStorage
} from "./helpers";

export interface CoreSlice {
  stocks: EvaluatedStock[];
  registeredCodes: string[];
  registeredNameMap: Record<string, string>;
  filters: StockFilters;
  sortKey: SortKey;
  selectedStockId: string | null;
  detailOpen: boolean;
  dataMode: DataMode;
  lastUpdatedAt: string | null;
  fallbackStartedAt: string | null;
  error: string | null;
  fallbackReason: string | null;
  health: ProviderHealth[];
  isLoading: boolean;
  refreshIntervalMinutes: number;
  autoRefreshEnabled: boolean;
  initialize: () => Promise<void>;
  refreshStocks: () => Promise<void>;
  registerSearchedStock: (payload: { code: string; name: string }) => Promise<{ ok: boolean; reason?: string }>;
  setFilters: (patch: Partial<StockFilters>) => void;
  resetFilters: () => void;
  setSortKey: (sortKey: SortKey) => void;
  openDetail: (stockId: string) => void;
  closeDetail: () => void;
  setRefreshInterval: (minutes: number) => void;
  setAutoRefresh: (enabled: boolean) => void;
}

export const createCoreSlice: StateCreator<StoreState, [], [], CoreSlice> = (set, get) => ({
  stocks: [],
  registeredCodes: [...DEFAULT_STOCK_CODES],
  registeredNameMap: {},
  filters: DEFAULT_FILTERS,
  sortKey: "score_desc",
  selectedStockId: null,
  detailOpen: false,
  dataMode: "mock",
  lastUpdatedAt: null,
  fallbackStartedAt: null,
  error: null,
  fallbackReason: null,
  health: [],
  isLoading: true,
  refreshIntervalMinutes: 15,
  autoRefreshEnabled: false,

  initialize: async () => {
    const alertState = initializeAlertStorage();
    const backtestState = initializeBacktestStorage();
    const archiveState = initializeArchiveStorage();
    const rawRegisteredCodes = readJSON<unknown>(REGISTERED_CODES_KEY, [...DEFAULT_STOCK_CODES]);
    const registeredCodes = normalizeRegisteredCodes(
      Array.isArray(rawRegisteredCodes)
        ? rawRegisteredCodes.filter((value): value is string => typeof value === "string")
        : []
    );
    const registeredNameMap = normalizeRegisteredNameMap(
      readJSON<unknown>(REGISTERED_NAME_MAP_KEY, {})
    );
    writeJSON(REGISTERED_CODES_KEY, registeredCodes);
    writeJSON(REGISTERED_NAME_MAP_KEY, registeredNameMap);
    const storedInterval = readJSON<number>(REFRESH_INTERVAL_KEY, 15);
    const refreshIntervalMinutes = typeof storedInterval === "number" && Number.isFinite(storedInterval) && storedInterval >= 1 && storedInterval <= 120 ? storedInterval : 15;
    const storedAutoRefresh = readJSON<boolean>(AUTO_REFRESH_KEY, false);
    const autoRefreshEnabled = typeof storedAutoRefresh === "boolean" ? storedAutoRefresh : false;
    set({
      watchMap: readJSON<Record<string, boolean>>(WATCH_KEY, {}),
      holdingsMap: readJSON<Record<string, number>>(HOLDINGS_KEY, {}),
      memoMap: readJSON<Record<string, string>>(MEMO_KEY, {}),
      hypothesisMap: readJSON<Record<string, HypothesisLog>>(HYPOTHESIS_KEY, {}),
      registeredCodes,
      registeredNameMap,
      refreshIntervalMinutes,
      autoRefreshEnabled,
      alertRules: alertState.alertRules,
      alertEvents: alertState.alertEvents,
      previousSnapshots: alertState.previousSnapshots,
      alertConditionState: alertState.alertConditionState,
      notificationsEnabled: alertState.notificationsEnabled,
      notificationsAvailable: alertState.notificationsAvailable,
      notificationPermission: alertState.notificationPermission,
      scoringConfig: backtestState.scoringConfig,
      backtestResults: backtestState.backtestResults,
      snapshots: archiveState.snapshots,
      savedScreens: archiveState.savedScreens,
      compareSelection: archiveState.compareSelection,
      autosaveSnapshots: archiveState.autosaveSnapshots,
      rankingSortKey: archiveState.rankingSortKey
    });
    await get().refreshStocks();
  },

  refreshStocks: async () => {
    set({ isLoading: true, error: null });
    try {
      const fetchCodes = normalizeRegisteredCodes(get().registeredCodes);
      const result = await stockService.fetchStocks(fetchCodes);
      const {
        watchMap,
        memoMap,
        registeredNameMap,
        selectedStockId,
        scoringConfig,
        dataMode: previousDataMode,
        fallbackStartedAt: previousFallbackStartedAt
      } = get();

      const evaluated = evaluateStocks(result.stocks, scoringConfig).map((stock) => {
        const nameOverride = registeredNameMap[stock.code];
        return {
          ...stock,
          name: nameOverride ?? stock.name,
          watched: watchMap[stock.id] ?? stock.watched ?? false,
          memo: memoMap[stock.id] ?? stock.memo ?? ""
        };
      });

      const resolvedSelected =
        selectedStockId && evaluated.some((stock) => stock.id === selectedStockId)
          ? selectedStockId
          : evaluated[0]?.id ?? null;

      const fallbackMode = result.dataMode === "fallback" || result.dataMode === "mock";
      const wasFallback = previousDataMode === "fallback" || previousDataMode === "mock";
      const fallbackStartedAt = fallbackMode
        ? wasFallback
          ? previousFallbackStartedAt ?? result.lastUpdatedAt
          : result.lastUpdatedAt
        : null;

      set({
        stocks: evaluated,
        selectedStockId: resolvedSelected,
        dataMode: result.dataMode,
        lastUpdatedAt: result.lastUpdatedAt,
        fallbackStartedAt,
        error: result.error,
        fallbackReason: result.fallbackReason,
        health: result.health,
        isLoading: false
      });
      get().runAlertEvaluation();
      if (get().autosaveSnapshots) {
        get().saveCurrentSnapshots("autosave");
      }
    } catch (error) {
      const current = get();
      const now = new Date().toISOString();
      const wasFallback = current.dataMode === "fallback" || current.dataMode === "mock";
      set({
        isLoading: false,
        dataMode: "mock",
        lastUpdatedAt: now,
        fallbackStartedAt: wasFallback ? current.fallbackStartedAt ?? now : now,
        error: error instanceof Error ? error.message : "データ更新に失敗しました。",
        fallbackReason: "データ更新に失敗したため mock データを表示しています。",
        health: []
      });
    }
  },

  registerSearchedStock: async ({ code, name }) => {
    const normalizedCode = code.trim();
    const trimmedName = name.trim();
    if (!/^\d{4}$/.test(normalizedCode)) {
      return { ok: false, reason: "invalid_code" };
    }

    let persistFailed = false;
    set((state) => {
      const registeredCodes = normalizeRegisteredCodes([...state.registeredCodes, normalizedCode]);
      const registeredNameMap = {
        ...state.registeredNameMap,
        ...(trimmedName ? { [normalizedCode]: trimmedName } : {})
      };

      const codesPersisted = writeJSON(REGISTERED_CODES_KEY, registeredCodes);
      const nameMapPersisted = writeJSON(REGISTERED_NAME_MAP_KEY, registeredNameMap);
      if (!codesPersisted || !nameMapPersisted) {
        persistFailed = true;
      }

      return { registeredCodes, registeredNameMap };
    });

    if (persistFailed) {
      notifyStorageFailure("registerSearchedStock");
      return { ok: false, reason: "storage_write_failed" };
    }

    await get().refreshStocks();
    return { ok: true };
  },

  setFilters: (patch) => {
    set((state) => ({ filters: { ...state.filters, ...patch } }));
  },

  resetFilters: () => {
    set({ filters: DEFAULT_FILTERS, sortKey: "score_desc" });
  },

  setSortKey: (sortKey) => {
    set({ sortKey });
  },

  openDetail: (stockId) => {
    set({ selectedStockId: stockId, detailOpen: true });
  },

  closeDetail: () => {
    set({ detailOpen: false });
  },

  setRefreshInterval: (minutes) => {
    const clamped = Math.min(120, Math.max(1, Math.floor(minutes)));
    set({ refreshIntervalMinutes: clamped });
    writeJSON(REFRESH_INTERVAL_KEY, clamped);
  },

  setAutoRefresh: (enabled) => {
    set({ autoRefreshEnabled: enabled });
    writeJSON(AUTO_REFRESH_KEY, enabled);
  }
});

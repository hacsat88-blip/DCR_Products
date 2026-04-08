"use client";

import { StateCreator } from "zustand";

import { DEFAULT_FILTERS } from "@/lib/filters";
import { DEFAULT_STOCK_CODES, DataMode, ProviderHealth } from "@/services/providers/types";
import { stockSearchService } from "@/services/stockSearchService";
import { stockService, StockFetchPhase } from "@/services/stockService";
import { RegisteredStockProfile, RegisteredStockProfileMap } from "@/types/stockProfile";
import { EvaluatedStock, HypothesisLog, SortKey, StockFilters } from "@/types/stock";
import { DEFAULT_SOURCE_META, SourceLabel, StockSourceMeta } from "@/types/source";

import type { StoreState } from "./types";
import {
  evaluateStocks,
  normalizeRegisteredCodes,
  normalizeRegisteredNameMap,
  normalizeRegisteredProfileMap,
  omitRecordKeys,
  readJSON,
  writeJSON,
  notifyStorageFailure,
  WATCH_KEY,
  HOLDINGS_KEY,
  MEMO_KEY,
  HYPOTHESIS_KEY,
  ALERT_RULES_KEY,
  ALERT_EVENTS_KEY,
  ALERT_SNAPSHOTS_KEY,
  ALERT_CONDITION_STATE_KEY,
  REGISTERED_CODES_KEY,
  REGISTERED_NAME_MAP_KEY,
  REGISTERED_PROFILE_MAP_KEY,
  ARCHIVE_COMPARE_KEY,
  REFRESH_INTERVAL_KEY,
  AUTO_REFRESH_KEY,
  applyRegisteredProfile,
  initializeAlertStorage,
  initializeBacktestStorage,
  initializeArchiveStorage
} from "./helpers";

export interface CoreSlice {
  stocks: EvaluatedStock[];
  registeredCodes: string[];
  registeredNameMap: Record<string, string>;
  registeredProfileMap: RegisteredStockProfileMap;
  filters: StockFilters;
  sortKey: SortKey;
  selectedStockId: string | null;
  detailOpen: boolean;
  dataMode: DataMode;
  sourceLabel: SourceLabel | null;
  sourceMeta: StockSourceMeta;
  lastUpdatedAt: string | null;
  fallbackStartedAt: string | null;
  error: string | null;
  fallbackReason: string | null;
  health: ProviderHealth[];
  isLoading: boolean;
  refreshIntervalMinutes: number;
  autoRefreshEnabled: boolean;
  initialize: () => Promise<void>;
  refreshStocks: (options?: { phase?: StockFetchPhase; signal?: AbortSignal }) => Promise<void>;
  registerSearchedStock: (payload: {
    code: string;
    name: string;
    sector: string | null;
    oneLiner: string;
    summary: string;
  }) => Promise<{ ok: boolean; reason?: string }>;
  removeRegisteredStock: (code: string) => { ok: boolean; reason?: string };
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
  registeredProfileMap: {},
  filters: DEFAULT_FILTERS,
  sortKey: "score_desc",
  selectedStockId: null,
  detailOpen: false,
  dataMode: "mock",
  sourceLabel: "M",
  sourceMeta: { ...DEFAULT_SOURCE_META },
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
    const hasStoredRegisteredCodes =
      typeof window !== "undefined" && window.localStorage.getItem(REGISTERED_CODES_KEY) !== null;
    const rawRegisteredCodes = readJSON<unknown>(
      REGISTERED_CODES_KEY,
      hasStoredRegisteredCodes ? [] : [...DEFAULT_STOCK_CODES]
    );
    const registeredCodes = normalizeRegisteredCodes(
      Array.isArray(rawRegisteredCodes)
        ? rawRegisteredCodes.filter((value): value is string => typeof value === "string")
        : [],
      {
        includeDefaults: !hasStoredRegisteredCodes,
        fallbackToDefaults: !hasStoredRegisteredCodes
      }
    );
    const registeredNameMap = normalizeRegisteredNameMap(
      readJSON<unknown>(REGISTERED_NAME_MAP_KEY, {})
    );
    const registeredProfileMap = normalizeRegisteredProfileMap(
      readJSON<unknown>(REGISTERED_PROFILE_MAP_KEY, {})
    );
    writeJSON(REGISTERED_CODES_KEY, registeredCodes);
    writeJSON(REGISTERED_NAME_MAP_KEY, registeredNameMap);
    writeJSON(REGISTERED_PROFILE_MAP_KEY, registeredProfileMap);
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
      registeredProfileMap,
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
  },

  refreshStocks: async (options) => {
    set({ isLoading: true, error: null });
    try {
      const fetchCodes = normalizeRegisteredCodes(get().registeredCodes, {
        includeDefaults: false,
        fallbackToDefaults: false
      });
      if (fetchCodes.length === 0) {
        set({
          stocks: [],
          selectedStockId: null,
          detailOpen: false,
          isLoading: false,
          error: null,
          fallbackReason: null,
          health: []
        });
        return;
      }
      const result = await stockService.fetchStocks(fetchCodes, options);
      const {
        watchMap,
        memoMap,
        registeredNameMap,
        registeredProfileMap,
        selectedStockId,
        scoringConfig,
        dataMode: previousDataMode,
        fallbackStartedAt: previousFallbackStartedAt
      } = get();

      const nextRegisteredProfileMap = { ...registeredProfileMap };
      const codesToBackfill = result.stocks
        .filter((stock) => stock.id.startsWith("live-") && !nextRegisteredProfileMap[stock.code])
        .map((stock) => stock.code);

      if (codesToBackfill.length > 0) {
        for (const code of codesToBackfill) {
          const matchedStock = result.stocks.find((stock) => stock.code === code);
          if (!matchedStock) {
            continue;
          }
          try {
            const payload = await stockSearchService.search(code);
            const exact = payload.results.find((item) => item.code === code);
            if (exact) {
              nextRegisteredProfileMap[code] = {
                sector: exact.sector,
                oneLiner: exact.oneLiner,
                summary: exact.summary,
                backfillState: "resolved",
                updatedAt: new Date().toISOString()
              };
              continue;
            }
          } catch {
            // Fall through to unavailable profile persistence.
          }

          nextRegisteredProfileMap[code] = {
            sector: matchedStock.sector === "未分類" ? null : matchedStock.sector,
            oneLiner: matchedStock.oneLiner,
            summary: matchedStock.summary,
            backfillState: "unavailable",
            updatedAt: new Date().toISOString()
          };
        }
        writeJSON(REGISTERED_PROFILE_MAP_KEY, nextRegisteredProfileMap);
      }

      const evaluated = evaluateStocks(result.stocks, scoringConfig).map((stock) => {
        const nameOverride = registeredNameMap[stock.code];
        const stockWithProfile = applyRegisteredProfile(stock, nextRegisteredProfileMap[stock.code]);
        return {
          ...stockWithProfile,
          name: nameOverride ?? stockWithProfile.name,
          watched: watchMap[stockWithProfile.id] ?? stockWithProfile.watched ?? false,
          memo: memoMap[stockWithProfile.id] ?? stockWithProfile.memo ?? ""
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
        registeredProfileMap: nextRegisteredProfileMap,
        selectedStockId: resolvedSelected,
        dataMode: result.dataMode,
        sourceLabel: result.sourceLabel ?? result.sourceMeta?.overall ?? "M",
        sourceMeta: result.sourceMeta ?? { ...DEFAULT_SOURCE_META },
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
      if (error instanceof Error && error.name === "AbortError") {
        set({ isLoading: false });
        return;
      }
      const current = get();
      const now = new Date().toISOString();
      const wasFallback = current.dataMode === "fallback" || current.dataMode === "mock";
      set({
        isLoading: false,
        dataMode: "mock",
        sourceLabel: "M",
        sourceMeta: { ...DEFAULT_SOURCE_META },
        lastUpdatedAt: now,
        fallbackStartedAt: wasFallback ? current.fallbackStartedAt ?? now : now,
        error: error instanceof Error ? error.message : "データ更新に失敗しました。",
        fallbackReason: "データ更新に失敗したため mock データを表示しています。",
        health: []
      });
    }
  },

  registerSearchedStock: async ({ code, name, sector, oneLiner, summary }) => {
    const normalizedCode = code.trim();
    const trimmedName = name.trim();
    if (!/^\d{4}$/.test(normalizedCode)) {
      return { ok: false, reason: "invalid_code" };
    }

    const trimmedOneLiner = oneLiner.trim();
    const trimmedSummary = summary.trim();
    const nextProfile: RegisteredStockProfile | null =
      trimmedOneLiner || trimmedSummary
        ? {
            sector,
            oneLiner: trimmedOneLiner || trimmedSummary,
            summary: trimmedSummary || trimmedOneLiner,
            backfillState: "resolved",
            updatedAt: new Date().toISOString()
          }
        : null;

    let persistFailed = false;
    set((state) => {
      const registeredCodes = normalizeRegisteredCodes([...state.registeredCodes, normalizedCode], {
        includeDefaults: false,
        fallbackToDefaults: false
      });
      const registeredNameMap = {
        ...state.registeredNameMap,
        ...(trimmedName ? { [normalizedCode]: trimmedName } : {})
      };
      const registeredProfileMap = nextProfile
        ? {
            ...state.registeredProfileMap,
            [normalizedCode]: nextProfile
          }
        : state.registeredProfileMap;

      const codesPersisted = writeJSON(REGISTERED_CODES_KEY, registeredCodes);
      const nameMapPersisted = writeJSON(REGISTERED_NAME_MAP_KEY, registeredNameMap);
      const profilePersisted = writeJSON(REGISTERED_PROFILE_MAP_KEY, registeredProfileMap);
      if (!codesPersisted || !nameMapPersisted || !profilePersisted) {
        persistFailed = true;
      }

      return { registeredCodes, registeredNameMap, registeredProfileMap };
    });

    if (persistFailed) {
      notifyStorageFailure("registerSearchedStock");
      return { ok: false, reason: "storage_write_failed" };
    }

    await get().refreshStocks();
    return { ok: true };
  },

  removeRegisteredStock: (code) => {
    const normalizedCode = code.trim();
    if (!/^\d{4}$/.test(normalizedCode)) {
      return { ok: false, reason: "invalid_code" };
    }

    let persistFailed = false;
    let removed = false;

    set((state) => {
      if (!state.registeredCodes.includes(normalizedCode)) {
        return {};
      }

      removed = true;

      const removedStockIds = new Set<string>([`live-${normalizedCode}`, `mock-${normalizedCode}`]);
      for (const stock of state.stocks) {
        if (stock.code === normalizedCode) {
          removedStockIds.add(stock.id);
        }
      }

      const stocks = state.stocks.filter((stock) => stock.code !== normalizedCode);
      const registeredCodes = normalizeRegisteredCodes(
        state.registeredCodes.filter((current) => current !== normalizedCode),
        {
          includeDefaults: false,
          fallbackToDefaults: false
        }
      );
      const registeredNameMap = omitRecordKeys(state.registeredNameMap, [normalizedCode]);
      const registeredProfileMap = omitRecordKeys(state.registeredProfileMap, [normalizedCode]);
      const watchMap = omitRecordKeys(state.watchMap, removedStockIds);
      const holdingsMap = omitRecordKeys(state.holdingsMap, removedStockIds);
      const memoMap = omitRecordKeys(state.memoMap, removedStockIds);
      const hypothesisMap = omitRecordKeys(state.hypothesisMap, removedStockIds);
      const compareSelection = state.compareSelection.filter((current) => current !== normalizedCode);
      const removedRuleIds = new Set(
        state.alertRules.filter((rule) => rule.stockCode === normalizedCode).map((rule) => rule.id)
      );
      const alertRules = state.alertRules.filter((rule) => rule.stockCode !== normalizedCode);
      const alertEvents = state.alertEvents.filter(
        (event) => event.stockCode !== normalizedCode && !removedRuleIds.has(event.ruleId)
      );
      const previousSnapshots = omitRecordKeys(state.previousSnapshots, [normalizedCode]);
      const alertConditionState = Object.fromEntries(
        Object.entries(state.alertConditionState).filter(([key]) => {
          const [ruleId, stockCode] = key.split("|");
          return !removedRuleIds.has(ruleId) && stockCode !== normalizedCode;
        })
      );
      const selectedRemoved =
        state.selectedStockId !== null && removedStockIds.has(state.selectedStockId);
      const selectedStockId = selectedRemoved ? stocks[0]?.id ?? null : state.selectedStockId;
      const detailOpen = selectedRemoved ? state.detailOpen && stocks.length > 0 : state.detailOpen;

      const persisted = [
        writeJSON(REGISTERED_CODES_KEY, registeredCodes),
        writeJSON(REGISTERED_NAME_MAP_KEY, registeredNameMap),
        writeJSON(REGISTERED_PROFILE_MAP_KEY, registeredProfileMap),
        writeJSON(WATCH_KEY, watchMap),
        writeJSON(HOLDINGS_KEY, holdingsMap),
        writeJSON(MEMO_KEY, memoMap),
        writeJSON(HYPOTHESIS_KEY, hypothesisMap),
        writeJSON(ARCHIVE_COMPARE_KEY, compareSelection),
        writeJSON(ALERT_RULES_KEY, alertRules),
        writeJSON(ALERT_EVENTS_KEY, alertEvents),
        writeJSON(ALERT_SNAPSHOTS_KEY, previousSnapshots),
        writeJSON(ALERT_CONDITION_STATE_KEY, alertConditionState)
      ];

      if (persisted.some((result) => !result)) {
        persistFailed = true;
      }

      return {
        stocks,
        registeredCodes,
        registeredNameMap,
        registeredProfileMap,
        watchMap,
        holdingsMap,
        memoMap,
        hypothesisMap,
        compareSelection,
        alertRules,
        alertEvents,
        previousSnapshots,
        alertConditionState,
        selectedStockId,
        detailOpen
      };
    });

    if (!removed) {
      return { ok: false, reason: "not_found" };
    }

    if (persistFailed) {
      notifyStorageFailure("removeRegisteredStock");
      return { ok: false, reason: "storage_write_failed" };
    }

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

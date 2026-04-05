"use client";

import { StateCreator } from "zustand";

import { filterStocks } from "@/lib/filters";
import { AlertEvent } from "@/types/alert";
import { BacktestResult } from "@/types/backtest";
import {
  ExportPayload,
  ImportOptions,
  ImportResult,
  CsvImportResult,
  RankingSortKey,
  SavedScreen,
  StockSnapshot
} from "@/types/archive";
import { EvaluatedStock, StockFilters } from "@/types/stock";

import type { StoreState } from "./types";
import {
  createId,
  writeJSON,
  writeString,
  notifyStorageFailure,
  normalizeRegisteredCodes,
  normalizeCompareSelection,
  normalizeSavedScreens,
  applySnapshotLimits,
  summarizeProviderHealth,
  createSnapshot,
  safeSortKey,
  safeRankingSortKey,
  sortStocksForRanking,
  downloadTextFile,
  csvEscape,
  ARCHIVE_SNAPSHOTS_KEY,
  ARCHIVE_SAVED_SCREENS_KEY,
  ARCHIVE_COMPARE_KEY,
  ARCHIVE_AUTOSAVE_KEY,
  ARCHIVE_EXPORT_SCHEMA_VERSION,
  ALERT_EVENTS_KEY,
  BACKTEST_RESULTS_KEY,
  BACKTEST_RESULTS_MAX,
  REGISTERED_CODES_KEY,
  REGISTERED_CODES_MAX,
  REGISTERED_NAME_MAP_KEY,
  RANKING_SORT_KEY,
  SAVED_SCREENS_MAX,
  COMPARE_MAX,
  DEFAULT_FILTERS
} from "./helpers";

export interface ArchiveSlice {
  snapshots: StockSnapshot[];
  savedScreens: SavedScreen[];
  compareSelection: string[];
  autosaveSnapshots: boolean;
  rankingSortKey: RankingSortKey;
  setRankingSortKey: (sortKey: RankingSortKey) => void;
  saveCurrentSnapshots: (source?: "manual" | "autosave") => void;
  deleteSnapshotCapture: (captureId: string) => void;
  clearSnapshots: () => void;
  setAutosaveSnapshots: (enabled: boolean) => void;
  addToCompare: (code: string) => void;
  removeFromCompare: (code: string) => void;
  clearCompare: () => void;
  saveScreen: (name: string) => void;
  updateSavedScreen: (
    screenId: string,
    patch: Partial<Pick<SavedScreen, "name">>
  ) => { ok: boolean; reason?: string };
  deleteSavedScreen: (screenId: string) => void;
  applySavedScreen: (screenId: string) => void;
  exportData: (selection?: {
    compareSelection?: boolean;
    snapshots?: boolean;
    alertEvents?: boolean;
    savedScreens?: boolean;
    backtestResults?: boolean;
    holdings?: boolean;
  }) => void;
  exportSnapshotsCsv: () => void;
  exportRankingCsv: (rows?: EvaluatedStock[]) => void;
  exportPortfolioCsv: () => void;
  importData: (payload: ExportPayload, options: ImportOptions) => ImportResult;
  importCsvWatchlist: (rows: { code: string; name?: string }[]) => CsvImportResult;
}

export const createArchiveSlice: StateCreator<StoreState, [], [], ArchiveSlice> = (set, get) => ({
  snapshots: [],
  savedScreens: [],
  compareSelection: [],
  autosaveSnapshots: false,
  rankingSortKey: "score_desc",

  setRankingSortKey: (rankingSortKey) => {
    set({ rankingSortKey });
    const persisted = writeString(RANKING_SORT_KEY, rankingSortKey);
    if (!persisted) {
      notifyStorageFailure("setRankingSortKey");
    }
  },

  saveCurrentSnapshots: (source = "manual") => {
    set((state) => {
      if (state.stocks.length === 0) {
        return {};
      }
      const checkedAt = state.lastUpdatedAt ?? new Date().toISOString();
      const providerHealth = summarizeProviderHealth(state.health);
      const captureId = createId("capture");
      const created = state.stocks.map((stock) =>
        createSnapshot(stock, checkedAt, state.dataMode, providerHealth, captureId, source)
      );
      const snapshots = applySnapshotLimits([...created, ...state.snapshots]);
      const persisted = writeJSON(ARCHIVE_SNAPSHOTS_KEY, snapshots);
      if (!persisted) {
        notifyStorageFailure("saveCurrentSnapshots");
      }
      return { snapshots };
    });
  },

  deleteSnapshotCapture: (captureId) => {
    set((state) => {
      const snapshots = state.snapshots.filter((snapshot) => snapshot.captureId !== captureId);
      writeJSON(ARCHIVE_SNAPSHOTS_KEY, snapshots);
      return { snapshots };
    });
  },

  clearSnapshots: () => {
    set(() => {
      writeJSON(ARCHIVE_SNAPSHOTS_KEY, []);
      return { snapshots: [] };
    });
  },

  setAutosaveSnapshots: (enabled) => {
    set(() => {
      writeJSON(ARCHIVE_AUTOSAVE_KEY, enabled);
      return { autosaveSnapshots: enabled };
    });
  },

  addToCompare: (code) => {
    set((state) => {
      const compareSelection = normalizeCompareSelection([...state.compareSelection, code]);
      writeJSON(ARCHIVE_COMPARE_KEY, compareSelection);
      return { compareSelection };
    });
  },

  removeFromCompare: (code) => {
    set((state) => {
      const compareSelection = state.compareSelection.filter((current) => current !== code);
      writeJSON(ARCHIVE_COMPARE_KEY, compareSelection);
      return { compareSelection };
    });
  },

  clearCompare: () => {
    set(() => {
      writeJSON(ARCHIVE_COMPARE_KEY, []);
      return { compareSelection: [] };
    });
  },

  saveScreen: (name) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    set((state) => {
      const now = new Date().toISOString();
      const filterState = { ...(state.filters as unknown as Record<string, unknown>) };
      const existing = state.savedScreens.find((screen) => screen.name === trimmed);
      let savedScreens: SavedScreen[];
      if (existing) {
        savedScreens = state.savedScreens.map((screen) =>
          screen.id === existing.id
            ? {
                ...screen,
                filters: filterState,
                sortKey: state.sortKey,
                rankingSortKey: state.rankingSortKey,
                compareSelection: state.compareSelection,
                updatedAt: now
              }
            : screen
        );
      } else {
        const created: SavedScreen = {
          id: createId("screen"),
          name: trimmed,
          filters: filterState,
          sortKey: state.sortKey,
          rankingSortKey: state.rankingSortKey,
          compareSelection: state.compareSelection,
          createdAt: now,
          updatedAt: now
        };
        savedScreens = [created, ...state.savedScreens];
      }
      const normalized = normalizeSavedScreens(savedScreens);
      const persisted = writeJSON(ARCHIVE_SAVED_SCREENS_KEY, normalized);
      if (!persisted) {
        notifyStorageFailure("saveScreen");
      }
      return { savedScreens: normalized };
    });
  },

  updateSavedScreen: (screenId, patch) => {
    const name = patch.name?.trim();
    if (patch.name !== undefined && !name) {
      return { ok: false, reason: "empty_name" };
    }
    if (name) {
      const duplicated = get().savedScreens.some(
        (screen) => screen.id !== screenId && screen.name === name
      );
      if (duplicated) {
        return { ok: false, reason: "duplicate_name" };
      }
    }
    let persistFailed = false;
    set((state) => {
      const savedScreens = state.savedScreens.map((screen) =>
        screen.id === screenId
          ? {
              ...screen,
              ...(name ? { name } : {}),
              updatedAt: new Date().toISOString()
            }
          : screen
      );
      const normalized = normalizeSavedScreens(savedScreens);
      const persisted = writeJSON(ARCHIVE_SAVED_SCREENS_KEY, normalized);
      if (!persisted) {
        persistFailed = true;
      }
      return { savedScreens: normalized };
    });
    if (persistFailed) {
      notifyStorageFailure("updateSavedScreen");
      return { ok: false, reason: "storage_write_failed" };
    }
    return { ok: true };
  },

  deleteSavedScreen: (screenId) => {
    set((state) => {
      const savedScreens = state.savedScreens.filter((screen) => screen.id !== screenId);
      writeJSON(ARCHIVE_SAVED_SCREENS_KEY, savedScreens);
      return { savedScreens };
    });
  },

  applySavedScreen: (screenId) => {
    set((state) => {
      const target = state.savedScreens.find((screen) => screen.id === screenId);
      if (!target) {
        return {};
      }
      const filters = {
        ...DEFAULT_FILTERS,
        ...(target.filters as Partial<StockFilters>)
      };
      const sortKey = safeSortKey(target.sortKey);
      const rankingSortKey = safeRankingSortKey(target.rankingSortKey ?? target.sortKey);
      const compareSelection = normalizeCompareSelection(target.compareSelection ?? []);
      const rankingPersisted = writeString(RANKING_SORT_KEY, rankingSortKey);
      const comparePersisted = writeJSON(ARCHIVE_COMPARE_KEY, compareSelection);
      if (!rankingPersisted || !comparePersisted) {
        notifyStorageFailure("applySavedScreen");
      }
      return { filters, sortKey, rankingSortKey, compareSelection };
    });
  },

  exportData: (selection) => {
    const state = get();
    const target = {
      compareSelection: selection?.compareSelection ?? true,
      snapshots: selection?.snapshots ?? true,
      alertEvents: selection?.alertEvents ?? true,
      savedScreens: selection?.savedScreens ?? true,
      backtestResults: selection?.backtestResults ?? true,
      holdings: selection?.holdings ?? false
    };
    const payload: ExportPayload = {
      schemaVersion: ARCHIVE_EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString()
    };
    if (target.snapshots) {
      payload.snapshots = state.snapshots;
    }
    if (target.compareSelection) {
      payload.compareSelection = state.compareSelection;
    }
    if (target.alertEvents) {
      payload.alertEvents = state.alertEvents;
    }
    if (target.savedScreens) {
      payload.savedScreens = state.savedScreens;
    }
    if (target.backtestResults) {
      payload.backtestResults = state.backtestResults;
    }
    if (target.holdings) {
      payload.holdings = state.holdingsMap;
    }
    downloadTextFile(
      `stock-monitor-export-${Date.now()}.json`,
      JSON.stringify(payload, null, 2),
      "application/json;charset=utf-8"
    );
  },

  exportSnapshotsCsv: () => {
    const state = get();
    const headers = [
      "id",
      "captureId",
      "captureSource",
      "checkedAt",
      "code",
      "name",
      "price",
      "changePercent",
      "score",
      "evaluatedAction",
      "revenueGrowth",
      "opGrowth",
      "operatingCF",
      "per",
      "pbr",
      "dividendYield",
      "scoreSummary",
      "narrativeSummary",
      "riskSignal",
      "collapseCondition",
      "dataMode",
      "providerHealth"
    ];
    const lines = [
      headers.join(","),
      ...state.snapshots.map((snapshot) =>
        [
          snapshot.id,
          snapshot.captureId,
          snapshot.captureSource,
          snapshot.checkedAt,
          snapshot.code,
          snapshot.name,
          snapshot.price,
          snapshot.changePercent,
          snapshot.score,
          snapshot.evaluatedAction,
          snapshot.revenueGrowth,
          snapshot.opGrowth,
          snapshot.operatingCF,
          snapshot.per,
          snapshot.pbr,
          snapshot.dividendYield,
          snapshot.scoreSummary,
          snapshot.narrativeSummary,
          snapshot.riskSignal,
          snapshot.collapseCondition,
          snapshot.dataMode,
          snapshot.providerHealth
        ]
          .map(csvEscape)
          .join(",")
      )
    ];
    downloadTextFile(
      `stock-monitor-snapshots-${Date.now()}.csv`,
      "\uFEFF" + lines.join("\n"),
      "text/csv;charset=utf-8"
    );
  },

  exportRankingCsv: (rows) => {
    const state = get();
    const baseRows =
      rows ??
      sortStocksForRanking(
        filterStocks(state.stocks, state.filters),
        state.rankingSortKey,
        state.backtestResults
      );
    const headers = [
      "rank",
      "code",
      "name",
      "score",
      "evaluatedAction",
      "price",
      "changePercent",
      "revenueGrowth",
      "opGrowth",
      "operatingCF",
      "per",
      "scoreSummary",
      "narrativeSummary",
      "oneLiner",
      "watched"
    ];
    const lines = [
      headers.join(","),
      ...baseRows.map((stock, index) =>
        [
          index + 1,
          stock.code,
          stock.name,
          stock.score,
          stock.evaluatedAction,
          stock.price,
          stock.changePercent,
          stock.revenueGrowth,
          stock.opGrowth,
          stock.operatingCF,
          stock.per,
          stock.scoreSummary,
          stock.summary,
          stock.oneLiner,
          stock.watched ? "yes" : "no"
        ]
          .map(csvEscape)
          .join(",")
      )
    ];
    downloadTextFile(
      `stock-monitor-ranking-${Date.now()}.csv`,
      "\uFEFF" + lines.join("\n"),
      "text/csv;charset=utf-8"
    );
  },

  exportPortfolioCsv: () => {
    const state = get();
    const holdingEntries = Object.entries(state.holdingsMap).filter(
      ([, qty]) => qty > 0
    );
    if (holdingEntries.length === 0) {
      return;
    }
    const stockMap = new Map(state.stocks.map((s) => [s.id, s]));
    const totalValue = holdingEntries.reduce((sum, [id, qty]) => {
      const stock = stockMap.get(id);
      return sum + (stock ? stock.price * qty : 0);
    }, 0);
    const headers = [
      "コード",
      "銘柄名",
      "セクター",
      "保有株数",
      "単価",
      "評価額",
      "構成比(%)",
      "スコア",
      "判定"
    ];
    const lines = [
      headers.join(","),
      ...holdingEntries.map(([id, qty]) => {
        const stock = stockMap.get(id);
        const price = stock?.price ?? 0;
        const value = price * qty;
        const weight = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : "0.0";
        return [
          stock?.code ?? id,
          stock?.name ?? "",
          stock?.sector ?? "",
          qty,
          price,
          value,
          weight,
          stock?.score ?? "",
          stock?.evaluatedAction ?? ""
        ]
          .map(csvEscape)
          .join(",");
      })
    ];
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    downloadTextFile(
      `portfolio_${dateStr}.csv`,
      "\uFEFF" + lines.join("\n"),
      "text/csv;charset=utf-8"
    );
  },

  importData: (payload, options) => {
    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    set((state) => {
      const patch: Partial<StoreState> = {};

      if (options.targets.snapshots && payload.snapshots) {
        const valid = payload.snapshots.filter(
          (s) => typeof s.code === "string" && typeof s.name === "string" && typeof s.checkedAt === "string"
        ) as StockSnapshot[];
        if (options.mergeStrategy === "overwrite") {
          const snapshots = applySnapshotLimits(valid);
          patch.snapshots = snapshots;
          imported += snapshots.length;
        } else if (options.mergeStrategy === "append") {
          const snapshots = applySnapshotLimits([...state.snapshots, ...valid]);
          imported += valid.length;
          patch.snapshots = snapshots;
        } else {
          const existingIds = new Set(state.snapshots.map((s) => s.id));
          const newItems = valid.filter((s) => !existingIds.has(s.id));
          const snapshots = applySnapshotLimits([...state.snapshots, ...newItems]);
          imported += newItems.length;
          skipped += valid.length - newItems.length;
          patch.snapshots = snapshots;
        }
        if (patch.snapshots) {
          writeJSON(ARCHIVE_SNAPSHOTS_KEY, patch.snapshots);
        }
      }

      if (options.targets.alertEvents && payload.alertEvents) {
        const valid = (payload.alertEvents as Record<string, unknown>[]).filter(
          (e) => typeof e.id === "string" && typeof e.title === "string" && typeof e.triggeredAt === "string"
        ) as unknown as AlertEvent[];
        if (options.mergeStrategy === "overwrite") {
          patch.alertEvents = valid;
          imported += valid.length;
        } else if (options.mergeStrategy === "append") {
          patch.alertEvents = [...state.alertEvents, ...valid];
          imported += valid.length;
        } else {
          const existingIds = new Set(state.alertEvents.map((e) => e.id));
          const newItems = valid.filter((e) => !existingIds.has(e.id));
          patch.alertEvents = [...state.alertEvents, ...newItems];
          imported += newItems.length;
          skipped += valid.length - newItems.length;
        }
        writeJSON(ALERT_EVENTS_KEY, patch.alertEvents);
      }

      if (options.targets.savedScreens && payload.savedScreens) {
        const valid = payload.savedScreens.filter(
          (s) => typeof s.id === "string" && typeof s.name === "string" && s.filters
        ) as SavedScreen[];
        if (options.mergeStrategy === "overwrite") {
          const limited = valid.slice(0, SAVED_SCREENS_MAX);
          patch.savedScreens = limited;
          imported += limited.length;
          if (valid.length > SAVED_SCREENS_MAX) {
            skipped += valid.length - SAVED_SCREENS_MAX;
          }
        } else {
          const existingIds = new Set(state.savedScreens.map((s) => s.id));
          const newItems = valid.filter((s) => !existingIds.has(s.id));
          const combined = [...state.savedScreens, ...newItems];
          const limited = combined.slice(0, SAVED_SCREENS_MAX);
          imported += Math.min(newItems.length, SAVED_SCREENS_MAX - state.savedScreens.length);
          skipped += valid.length - Math.min(newItems.length, SAVED_SCREENS_MAX - state.savedScreens.length);
          patch.savedScreens = limited;
        }
        writeJSON(ARCHIVE_SAVED_SCREENS_KEY, patch.savedScreens);
      }

      if (options.targets.backtestResults && payload.backtestResults) {
        const valid = (payload.backtestResults as Record<string, unknown>[]).filter(
          (b) => typeof b.id === "string" && typeof b.startedAt === "string" && typeof b.endedAt === "string"
        ) as unknown as BacktestResult[];
        if (options.mergeStrategy === "overwrite") {
          const limited = valid.slice(0, BACKTEST_RESULTS_MAX);
          patch.backtestResults = limited;
          imported += limited.length;
        } else {
          const existingIds = new Set(state.backtestResults.map((b) => b.id));
          const newItems = valid.filter((b) => !existingIds.has(b.id));
          const combined = [...state.backtestResults, ...newItems].slice(0, BACKTEST_RESULTS_MAX);
          imported += newItems.filter((_, i) => i < BACKTEST_RESULTS_MAX - state.backtestResults.length).length;
          skipped += valid.length - newItems.filter((_, i) => i < BACKTEST_RESULTS_MAX - state.backtestResults.length).length;
          patch.backtestResults = combined;
        }
        writeJSON(BACKTEST_RESULTS_KEY, patch.backtestResults);
      }

      if (options.targets.compareSelection && payload.compareSelection) {
        const valid = payload.compareSelection.filter((c) => typeof c === "string");
        if (options.mergeStrategy === "overwrite") {
          const limited = valid.slice(0, COMPARE_MAX);
          patch.compareSelection = limited;
          imported += limited.length;
        } else {
          const existing = new Set(state.compareSelection);
          const newItems = valid.filter((c) => !existing.has(c));
          const combined = [...state.compareSelection, ...newItems].slice(0, COMPARE_MAX);
          imported += combined.length - state.compareSelection.length;
          skipped += valid.length - (combined.length - state.compareSelection.length);
          patch.compareSelection = combined;
        }
        writeJSON(ARCHIVE_COMPARE_KEY, patch.compareSelection);
      }

      return patch;
    });

    return { imported, skipped, errors };
  },

  importCsvWatchlist: (rows) => {
    let added = 0;
    let skipped = 0;

    set((state) => {
      const existingSet = new Set(state.registeredCodes);
      const newCodes: string[] = [];
      const nameMap: Record<string, string> = { ...state.registeredNameMap };

      for (const row of rows) {
        const code = row.code.trim();
        if (!/^\d{4}$/.test(code)) {
          skipped++;
          continue;
        }
        if (existingSet.has(code)) {
          skipped++;
          continue;
        }
        if (state.registeredCodes.length + newCodes.length >= REGISTERED_CODES_MAX) {
          skipped++;
          continue;
        }
        existingSet.add(code);
        newCodes.push(code);
        if (row.name) {
          nameMap[code] = row.name;
        }
        added++;
      }

      if (newCodes.length === 0) {
        return {};
      }

      const registeredCodes = normalizeRegisteredCodes([...state.registeredCodes, ...newCodes]);
      const registeredNameMap = nameMap;
      writeJSON(REGISTERED_CODES_KEY, registeredCodes);
      writeJSON(REGISTERED_NAME_MAP_KEY, registeredNameMap);

      return { registeredCodes, registeredNameMap };
    });

    return { added, skipped };
  }
});

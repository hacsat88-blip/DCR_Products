"use client";

import { create } from "zustand";

import { DEFAULT_FILTERS } from "@/lib/filters";
import type {
  ExportPayload,
  NormalizedSavedScreen,
  NormalizedStockSnapshot,
  RankingSortKey,
  SavedScreen,
  SnapshotCaptureSource,
  StockSnapshot
} from "@/types/archive";
import { EvaluatedStock } from "@/types/stock";
import type { SortKey, StockFilters } from "@/types/stock";

import {
  createCoreSlice,
  createPortfolioSlice,
  createAlertSlice,
  createScoringSlice,
  createArchiveSlice
} from "./slices";
import type { StoreState } from "./slices";

export const useStockStore = create<StoreState>()((...a) => ({
  ...createCoreSlice(...a),
  ...createPortfolioSlice(...a),
  ...createAlertSlice(...a),
  ...createScoringSlice(...a),
  ...createArchiveSlice(...a)
}));

const SORT_KEYS: SortKey[] = [
  "score_desc",
  "price_asc",
  "price_desc",
  "revenue_growth_desc",
  "op_growth_desc"
];

const RANKING_SORT_KEYS: RankingSortKey[] = [
  "score_desc",
  "price_asc",
  "price_desc",
  "revenue_growth_desc",
  "op_growth_desc",
  "operating_cf_desc",
  "per_asc",
  "backtest_excess_desc",
  "action_priority"
];

const COMPARE_MAX = 4;
const FILTER_ACTIONS: StockFilters["action"][] = [
  "all",
  "buy_now",
  "wait_earnings",
  "wait_pullback",
  "exclude"
];
const FILTER_MARKET_CAP_BANDS: StockFilters["marketCapBand"][] = ["all", "small", "mid", "large"];
const FILTER_DIVIDEND_VALUES: StockFilters["dividend"][] = ["all", "with", "without"];
const FILTER_WATCH_VALUES: StockFilters["watch"][] = ["all", "watching", "not_watching"];

function safeSortKey(value: unknown): SortKey {
  if (typeof value === "string" && SORT_KEYS.includes(value as SortKey)) {
    return value as SortKey;
  }
  return "score_desc";
}

function safeRankingSortKey(value: unknown, fallbackSortKey: SortKey): RankingSortKey {
  if (typeof value === "string" && RANKING_SORT_KEYS.includes(value as RankingSortKey)) {
    return value as RankingSortKey;
  }
  if (RANKING_SORT_KEYS.includes(fallbackSortKey as RankingSortKey)) {
    return fallbackSortKey as RankingSortKey;
  }
  return "score_desc";
}

function normalizeCompareSelection(codes: unknown): string[] {
  if (!Array.isArray(codes)) {
    return [];
  }
  const unique: string[] = [];
  for (const code of codes) {
    if (typeof code !== "string") {
      continue;
    }
    const normalizedCode = code.trim();
    if (!normalizedCode || unique.includes(normalizedCode)) {
      continue;
    }
    unique.push(normalizedCode);
    if (unique.length >= COMPARE_MAX) {
      break;
    }
  }
  return unique;
}

function safeEnumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value === "string" && allowed.includes(value as T)) {
    return value as T;
  }
  return fallback;
}

function readNullableFiniteNumber(value: unknown): number | null | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return undefined;
}

function sanitizeSavedScreenFilters(rawFilters: unknown): StockFilters {
  const filters: StockFilters = { ...DEFAULT_FILTERS };
  if (!isRecord(rawFilters)) {
    return filters;
  }

  if (typeof rawFilters.query === "string") {
    filters.query = rawFilters.query;
  }
  if (typeof rawFilters.sector === "string") {
    filters.sector = rawFilters.sector;
  }
  filters.action = safeEnumValue(rawFilters.action, FILTER_ACTIONS, filters.action);
  filters.marketCapBand = safeEnumValue(
    rawFilters.marketCapBand,
    FILTER_MARKET_CAP_BANDS,
    filters.marketCapBand
  );
  filters.dividend = safeEnumValue(rawFilters.dividend, FILTER_DIVIDEND_VALUES, filters.dividend);
  filters.watch = safeEnumValue(rawFilters.watch, FILTER_WATCH_VALUES, filters.watch);

  const priceMin = readNullableFiniteNumber(rawFilters.priceMin);
  if (priceMin !== undefined) {
    filters.priceMin = priceMin;
  }
  const priceMax = readNullableFiniteNumber(rawFilters.priceMax);
  if (priceMax !== undefined) {
    filters.priceMax = priceMax;
  }
  const revenueGrowthMin = readNullableFiniteNumber(rawFilters.revenueGrowthMin);
  if (revenueGrowthMin !== undefined) {
    filters.revenueGrowthMin = revenueGrowthMin;
  }
  const opGrowthMin = readNullableFiniteNumber(rawFilters.opGrowthMin);
  if (opGrowthMin !== undefined) {
    filters.opGrowthMin = opGrowthMin;
  }
  const operatingCFMin = readNullableFiniteNumber(rawFilters.operatingCFMin);
  if (operatingCFMin !== undefined) {
    filters.operatingCFMin = operatingCFMin;
  }
  const perMax = readNullableFiniteNumber(rawFilters.perMax);
  if (perMax !== undefined) {
    filters.perMax = perMax;
  }
  const pbrMax = readNullableFiniteNumber(rawFilters.pbrMax);
  if (pbrMax !== undefined) {
    filters.pbrMax = pbrMax;
  }

  return filters;
}

function resolveCaptureSource(source: StockSnapshot["captureSource"]): SnapshotCaptureSource {
  return source === "autosave" ? "autosave" : "manual";
}

function normalizeCheckedAtBucket(checkedAt: unknown): string {
  if (typeof checkedAt !== "string") {
    return "unknown";
  }
  return checkedAt.trim() || "unknown";
}

function buildImportedCaptureId(checkedAt: unknown, index: number): string {
  const safeCheckedAt = normalizeCheckedAtBucket(checkedAt);
  return `capture-import-${safeCheckedAt}-${index}`;
}

export function normalizeSnapshotsForImport(snapshots: StockSnapshot[]): NormalizedStockSnapshot[] {
  const captureIdByCheckedAt = new Map<string, string>();

  return snapshots.map((snapshot, index) => {
    const bucket = normalizeCheckedAtBucket(snapshot.checkedAt);
    const existingBucketCaptureId = captureIdByCheckedAt.get(bucket);
    const captureId =
      typeof snapshot.captureId === "string" && snapshot.captureId.trim()
        ? snapshot.captureId
        : existingBucketCaptureId ?? buildImportedCaptureId(snapshot.checkedAt, index);

    if (!captureIdByCheckedAt.has(bucket)) {
      captureIdByCheckedAt.set(bucket, captureId);
    }

    return {
      ...snapshot,
      captureId,
      captureSource: resolveCaptureSource(snapshot.captureSource)
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function restoreSavedScreenState(screen: SavedScreen): {
  filters: StockFilters;
  sortKey: SortKey;
  rankingSortKey: RankingSortKey;
  compareSelection: string[];
} {
  const sortKey = safeSortKey(screen.sortKey);
  const rankingSortKey = safeRankingSortKey(screen.rankingSortKey, sortKey);
  const compareSelection = normalizeCompareSelection(screen.compareSelection);
  const filters = sanitizeSavedScreenFilters(screen.filters);
  return { filters, sortKey, rankingSortKey, compareSelection };
}

export function normalizeSavedScreensForImport(savedScreens: SavedScreen[]): NormalizedSavedScreen[] {
  return savedScreens.map((screen) => {
    const restored = restoreSavedScreenState(screen);
    const now = new Date().toISOString();

    return {
      ...screen,
      filters: restored.filters as unknown as Record<string, unknown>,
      sortKey: restored.sortKey,
      rankingSortKey: restored.rankingSortKey,
      compareSelection: restored.compareSelection,
      createdAt: typeof screen.createdAt === "string" ? screen.createdAt : now,
      updatedAt: typeof screen.updatedAt === "string" ? screen.updatedAt : now
    };
  });
}

export function normalizeExportPayloadForImport(payload: ExportPayload): ExportPayload {
  return {
    ...payload,
    snapshots: payload.snapshots ? normalizeSnapshotsForImport(payload.snapshots) : undefined,
    savedScreens: payload.savedScreens
      ? normalizeSavedScreensForImport(payload.savedScreens)
      : undefined,
    compareSelection: payload.compareSelection
      ? normalizeCompareSelection(payload.compareSelection)
      : undefined
  };
}

export function useSelectedStock(): EvaluatedStock | null {
  return useStockStore((state) => {
    if (!state.selectedStockId) {
      return null;
    }
    return state.stocks.find((stock) => stock.id === state.selectedStockId) ?? null;
  });
}

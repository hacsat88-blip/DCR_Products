import { DataMode, ProviderHealth } from "@/services/providers/types";
import { RankingSortKey, SavedScreen, StockSnapshot } from "@/types/archive";
import { BacktestResult } from "@/types/backtest";
import { EvaluatedStock } from "@/types/stock";

import { createId, safeSortKey } from "./core";
import { readJSON, readString, writeJSON, writeString } from "./persistence";

export const ARCHIVE_SNAPSHOTS_KEY = "stock-monitor-archive-snapshots-v1";
export const ARCHIVE_SAVED_SCREENS_KEY = "stock-monitor-saved-screens-v1";
export const ARCHIVE_COMPARE_KEY = "stock-monitor-compare-selection-v1";
export const ARCHIVE_AUTOSAVE_KEY = "stock-monitor-autosave-snapshots-v1";
export const ARCHIVE_SCHEMA_VERSION_KEY = "stock-monitor-archive-schema-version";
export const ARCHIVE_SCHEMA_VERSION = "phase5-v2";
export const ARCHIVE_EXPORT_SCHEMA_VERSION = "phase5-export-v1";
export const RANKING_SORT_KEY = "stock-monitor-ranking-sort-v1";

export const SNAPSHOTS_MAX = 500;
export const SAVED_SCREENS_MAX = 30;
export const COMPARE_MAX = 4;
export const AUTOSAVE_CAPTURE_LIMIT = 30;

export function normalizeSavedScreens(screens: SavedScreen[]): SavedScreen[] {
  return [...screens]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, SAVED_SCREENS_MAX);
}

export function normalizeCompareSelection(codes: string[]): string[] {
  const unique: string[] = [];
  for (const code of codes) {
    if (!code || unique.includes(code)) {
      continue;
    }
    unique.push(code);
    if (unique.length >= COMPARE_MAX) {
      break;
    }
  }
  return unique;
}

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

function isRankingSortKey(value: string | null | undefined): value is RankingSortKey {
  if (!value) {
    return false;
  }
  return RANKING_SORT_KEYS.includes(value as RankingSortKey);
}

export function safeRankingSortKey(value: string | null | undefined): RankingSortKey {
  if (isRankingSortKey(value)) {
    return value;
  }
  return "score_desc";
}

export function summarizeProviderHealth(health: ProviderHealth[]): string {
  if (health.length === 0) {
    return "";
  }
  return health
    .map((item) => `${item.provider}:${item.ok ? "ok" : "failed"}`)
    .sort((a, b) => a.localeCompare(b))
    .join(",");
}

export function toNullableNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function createSnapshot(
  stock: EvaluatedStock,
  checkedAt: string,
  dataMode: DataMode,
  providerHealthSummary: string,
  captureId: string,
  captureSource: "manual" | "autosave"
): StockSnapshot {
  return {
    id: createId(`snapshot-${stock.code}`),
    captureId,
    captureSource,
    code: stock.code,
    name: stock.name,
    checkedAt,
    price: toNullableNumber(stock.price),
    changePercent: toNullableNumber(stock.changePercent),
    marketCap: toNullableNumber(stock.marketCap),
    per: toNullableNumber(stock.per),
    pbr: toNullableNumber(stock.pbr),
    dividendYield: toNullableNumber(stock.dividendYield),
    revenueGrowth: toNullableNumber(stock.revenueGrowth),
    opGrowth: toNullableNumber(stock.opGrowth),
    operatingCF: toNullableNumber(stock.operatingCF),
    score: toNullableNumber(stock.score),
    evaluatedAction: stock.evaluatedAction ?? null,
    scoreSummary: stock.scoreSummary,
    narrativeSummary: stock.summary,
    coreKpiLabel: stock.coreKpiLabel,
    coreKpiValue: stock.coreKpiValue,
    riskSignal: stock.riskSignal,
    collapseCondition: stock.collapseCondition,
    dataMode,
    providerHealth: providerHealthSummary
  };
}

function withCaptureMigration(rows: StockSnapshot[]): StockSnapshot[] {
  const captureByCheckedAt = new Map<string, string>();
  return rows.map((row) => {
    const existingCaptureId = row.captureId;
    if (existingCaptureId) {
      return row;
    }
    const bucket = row.checkedAt || "unknown";
    const generated = captureByCheckedAt.get(bucket) ?? createId("capture-migrated");
    if (!captureByCheckedAt.has(bucket)) {
      captureByCheckedAt.set(bucket, generated);
    }
    return {
      ...row,
      captureId: generated,
      captureSource: row.captureSource ?? "manual"
    };
  });
}

interface SnapshotCaptureGroup {
  captureId: string;
  captureSource: "manual" | "autosave";
  checkedAtTs: number;
  rows: StockSnapshot[];
}

function parseTimestamp(value: string): number {
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
}

function toSnapshotCaptureGroups(rows: StockSnapshot[]): SnapshotCaptureGroup[] {
  const groups = new Map<string, SnapshotCaptureGroup>();
  for (const row of rows) {
    const captureSource: "manual" | "autosave" = row.captureSource === "autosave" ? "autosave" : "manual";
    const checkedAtTs = parseTimestamp(row.checkedAt);
    const current = groups.get(row.captureId);
    if (!current) {
      groups.set(row.captureId, {
        captureId: row.captureId,
        captureSource,
        checkedAtTs,
        rows: [row]
      });
      continue;
    }
    current.rows.push(row);
    if (checkedAtTs > current.checkedAtTs) {
      current.checkedAtTs = checkedAtTs;
    }
    if (captureSource === "manual") {
      current.captureSource = "manual";
    }
  }
  return [...groups.values()].sort((a, b) => b.checkedAtTs - a.checkedAtTs);
}

export function applySnapshotLimits(rows: StockSnapshot[]): StockSnapshot[] {
  const sorted = [...rows].sort((a, b) => Date.parse(b.checkedAt) - Date.parse(a.checkedAt));
  const normalized = withCaptureMigration(sorted);
  const groups = toSnapshotCaptureGroups(normalized);

  const autosaveTrimmedGroups: SnapshotCaptureGroup[] = [];
  let autosaveCount = 0;
  for (const group of groups) {
    if (group.captureSource === "autosave") {
      autosaveCount += 1;
      if (autosaveCount > AUTOSAVE_CAPTURE_LIMIT) {
        continue;
      }
    }
    autosaveTrimmedGroups.push(group);
  }

  const keptGroups: SnapshotCaptureGroup[] = [];
  let rowCount = 0;
  for (const group of autosaveTrimmedGroups) {
    if (rowCount + group.rows.length > SNAPSHOTS_MAX) {
      continue;
    }
    keptGroups.push(group);
    rowCount += group.rows.length;
  }

  const keepCaptureIds = new Set(keptGroups.map((group) => group.captureId));
  return normalized.filter((row) => keepCaptureIds.has(row.captureId));
}

function migrateSnapshotRecord(raw: unknown): StockSnapshot | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Partial<StockSnapshot> & Record<string, unknown>;
  if (typeof record.code !== "string" || typeof record.name !== "string" || typeof record.checkedAt !== "string") {
    return null;
  }
  return {
    id: typeof record.id === "string" ? record.id : createId("snapshot-migrated"),
    captureId:
      typeof record.captureId === "string" && record.captureId
        ? record.captureId
        : "",
    captureSource:
      record.captureSource === "manual" || record.captureSource === "autosave"
        ? record.captureSource
        : undefined,
    code: record.code,
    name: record.name,
    checkedAt: record.checkedAt,
    price: toNullableNumber(record.price as number | null | undefined),
    changePercent: toNullableNumber(record.changePercent as number | null | undefined),
    marketCap: toNullableNumber(record.marketCap as number | null | undefined),
    per: toNullableNumber(record.per as number | null | undefined),
    pbr: toNullableNumber(record.pbr as number | null | undefined),
    dividendYield: toNullableNumber(record.dividendYield as number | null | undefined),
    revenueGrowth: toNullableNumber(record.revenueGrowth as number | null | undefined),
    opGrowth: toNullableNumber(record.opGrowth as number | null | undefined),
    operatingCF: toNullableNumber(record.operatingCF as number | null | undefined),
    score: toNullableNumber(record.score as number | null | undefined),
    evaluatedAction: typeof record.evaluatedAction === "string" ? record.evaluatedAction : null,
    scoreSummary: typeof record.scoreSummary === "string" ? record.scoreSummary : "",
    narrativeSummary:
      typeof record.narrativeSummary === "string" ? record.narrativeSummary : undefined,
    coreKpiLabel: typeof record.coreKpiLabel === "string" ? record.coreKpiLabel : undefined,
    coreKpiValue: typeof record.coreKpiValue === "string" ? record.coreKpiValue : undefined,
    riskSignal: typeof record.riskSignal === "string" ? record.riskSignal : undefined,
    collapseCondition:
      typeof record.collapseCondition === "string" ? record.collapseCondition : undefined,
    dataMode: typeof record.dataMode === "string" ? record.dataMode : null,
    providerHealth:
      typeof record.providerHealth === "string" ? record.providerHealth : null
  };
}

export function migrateSnapshots(raw: unknown): StockSnapshot[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const valid = raw
    .map((item) => migrateSnapshotRecord(item))
    .filter((item): item is StockSnapshot => item !== null);
  return applySnapshotLimits(valid);
}

export function migrateSavedScreens(raw: unknown): SavedScreen[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const valid: SavedScreen[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const screen = item as Partial<SavedScreen> & Record<string, unknown>;
    if (typeof screen.id !== "string" || typeof screen.name !== "string") {
      continue;
    }
    if (!screen.filters || typeof screen.filters !== "object" || Array.isArray(screen.filters)) {
      continue;
    }
    const sortKey = typeof screen.sortKey === "string" ? safeSortKey(screen.sortKey) : "score_desc";
    const rankingSortKey =
      safeRankingSortKey(
        typeof screen.rankingSortKey === "string" ? screen.rankingSortKey : sortKey
      );
    valid.push({
      id: screen.id,
      name: screen.name,
      filters: screen.filters as Record<string, unknown>,
      sortKey,
      rankingSortKey,
      compareSelection: normalizeCompareSelection(
        Array.isArray(screen.compareSelection)
          ? screen.compareSelection.filter((value): value is string => typeof value === "string")
          : []
      ),
      sortOrder:
        screen.sortOrder === "asc" || screen.sortOrder === "desc"
          ? screen.sortOrder
          : undefined,
      createdAt:
        typeof screen.createdAt === "string" ? screen.createdAt : new Date().toISOString(),
      updatedAt:
        typeof screen.updatedAt === "string" ? screen.updatedAt : new Date().toISOString()
    });
  }
  return normalizeSavedScreens(valid);
}

export function downloadTextFile(fileName: string, content: string, mimeType: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

export function sortStocksForRanking(
  stocks: EvaluatedStock[],
  rankingSortKey: RankingSortKey,
  backtestResults: BacktestResult[]
): EvaluatedStock[] {
  const excessMap = new Map<string, number>();
  for (const result of backtestResults) {
    if (result.stockCode && result.excessReturnPct !== null && !excessMap.has(result.stockCode)) {
      excessMap.set(result.stockCode, result.excessReturnPct);
    }
  }

  const actionPriority: Record<string, number> = {
    buy_now: 0,
    wait_earnings: 1,
    wait_pullback: 2,
    exclude: 3
  };

  const copied = [...stocks];
  copied.sort((a, b) => {
    if (rankingSortKey === "score_desc") {
      return b.score - a.score;
    }
    if (rankingSortKey === "price_asc") {
      return a.price - b.price;
    }
    if (rankingSortKey === "price_desc") {
      return b.price - a.price;
    }
    if (rankingSortKey === "revenue_growth_desc") {
      return (b.revenueGrowth ?? -Infinity) - (a.revenueGrowth ?? -Infinity);
    }
    if (rankingSortKey === "op_growth_desc") {
      return (b.opGrowth ?? -Infinity) - (a.opGrowth ?? -Infinity);
    }
    if (rankingSortKey === "operating_cf_desc") {
      return (b.operatingCF ?? -Infinity) - (a.operatingCF ?? -Infinity);
    }
    if (rankingSortKey === "per_asc") {
      return (a.per ?? Infinity) - (b.per ?? Infinity);
    }
    if (rankingSortKey === "backtest_excess_desc") {
      return (excessMap.get(b.code) ?? -Infinity) - (excessMap.get(a.code) ?? -Infinity);
    }
    return (actionPriority[a.evaluatedAction] ?? 99) - (actionPriority[b.evaluatedAction] ?? 99);
  });
  return copied;
}

export function initializeArchiveStorage(): {
  snapshots: StockSnapshot[];
  savedScreens: SavedScreen[];
  compareSelection: string[];
  autosaveSnapshots: boolean;
  rankingSortKey: RankingSortKey;
} {
  const version = readString(ARCHIVE_SCHEMA_VERSION_KEY, "");
  const snapshots = migrateSnapshots(readJSON<unknown>(ARCHIVE_SNAPSHOTS_KEY, []));
  const savedScreens = migrateSavedScreens(readJSON<unknown>(ARCHIVE_SAVED_SCREENS_KEY, []));
  const compareRaw = readJSON<unknown>(ARCHIVE_COMPARE_KEY, []);
  const compareSelection = normalizeCompareSelection(
    Array.isArray(compareRaw)
      ? compareRaw.filter((value): value is string => typeof value === "string")
      : []
  );
  const autosaveRaw = readJSON<unknown>(ARCHIVE_AUTOSAVE_KEY, false);
  const autosaveSnapshots = typeof autosaveRaw === "boolean" ? autosaveRaw : false;
  const rankingSortKey = safeRankingSortKey(readString(RANKING_SORT_KEY, "score_desc"));

  writeJSON(ARCHIVE_SNAPSHOTS_KEY, snapshots);
  writeJSON(ARCHIVE_SAVED_SCREENS_KEY, savedScreens);
  writeJSON(ARCHIVE_COMPARE_KEY, compareSelection);
  writeJSON(ARCHIVE_AUTOSAVE_KEY, autosaveSnapshots);
  writeString(RANKING_SORT_KEY, rankingSortKey);
  if (version !== ARCHIVE_SCHEMA_VERSION) {
    writeString(ARCHIVE_SCHEMA_VERSION_KEY, ARCHIVE_SCHEMA_VERSION);
  }

  return {
    snapshots,
    savedScreens,
    compareSelection,
    autosaveSnapshots,
    rankingSortKey
  };
}

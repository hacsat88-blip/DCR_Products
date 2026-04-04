"use client";

import { create } from "zustand";

import {
  ALERT_PRESET_CATALOG,
  AlertPresetId,
  createInitialAlertRules,
  createRulesFromPreset,
  defaultRuleThreshold
} from "@/lib/alertPresets";
import {
  buildAlertConditionBaseline,
  buildAlertSnapshots,
  evaluateAlerts
} from "@/lib/alertEngine";
import { runSingleStockBacktest, runWatchlistBacktest } from "@/lib/backtestEngine";
import { DEFAULT_FILTERS, filterStocks } from "@/lib/filters";
import { DEFAULT_SCORING_CONFIG, evaluateStock } from "@/lib/scoring";
import { DEFAULT_STOCK_CODES, DataMode, ProviderHealth } from "@/services/providers/types";
import { stockService } from "@/services/stockService";
import { getSampleHistoryForStock } from "@/data/sampleHistory";
import { AlertEvent, AlertRule, PreviousStockSnapshot } from "@/types/alert";
import { ExportPayload, ImportOptions, ImportResult, CsvImportResult, RankingSortKey, SavedScreen, StockSnapshot } from "@/types/archive";
import { BacktestResult, BacktestRunParams, HistoryDataPoint } from "@/types/backtest";
import { ScoringConfig } from "@/types/scoring";
import { EvaluatedStock, HypothesisLog, SortKey, Stock, StockFilters } from "@/types/stock";

const WATCH_KEY = "stock-monitor-watch-v1";
const HOLDINGS_KEY = "stock-monitor-holdings-v1";
const MEMO_KEY = "stock-monitor-memo-v1";
const HYPOTHESIS_KEY = "stock-monitor-hypothesis-v1";
const ALERT_RULES_KEY = "stock-monitor-alert-rules-v1";
const ALERT_EVENTS_KEY = "stock-monitor-alert-events-v1";
const ALERT_SNAPSHOTS_KEY = "stock-monitor-alert-snapshots-v1";
const ALERT_CONDITION_STATE_KEY = "stock-monitor-alert-condition-state-v1";
const ALERT_NOTIFICATIONS_KEY = "stock-monitor-alert-notifications-v1";
const ALERT_SCHEMA_VERSION_KEY = "stock-monitor-alert-schema-version";
const ALERT_SCHEMA_VERSION = "phase3-v1";

const SCORING_CONFIG_KEY = "stock-monitor-scoring-config-v1";
const BACKTEST_RESULTS_KEY = "stock-monitor-backtest-results-v1";
const BACKTEST_SCHEMA_VERSION_KEY = "stock-monitor-backtest-schema-version";
const BACKTEST_SCHEMA_VERSION = "phase4-v1";
const BACKTEST_RESULTS_MAX = 20;
const REGISTERED_CODES_KEY = "stock-monitor-registered-codes-v1";
const REGISTERED_NAME_MAP_KEY = "stock-monitor-registered-name-map-v1";
const REGISTERED_CODES_MAX = 30;
const REFRESH_INTERVAL_KEY = "stock-monitor-refresh-interval-v1";
const AUTO_REFRESH_KEY = "stock-monitor-auto-refresh-v1";

const ARCHIVE_SNAPSHOTS_KEY = "stock-monitor-archive-snapshots-v1";
const ARCHIVE_SAVED_SCREENS_KEY = "stock-monitor-saved-screens-v1";
const ARCHIVE_COMPARE_KEY = "stock-monitor-compare-selection-v1";
const ARCHIVE_AUTOSAVE_KEY = "stock-monitor-autosave-snapshots-v1";
const ARCHIVE_SCHEMA_VERSION_KEY = "stock-monitor-archive-schema-version";
const ARCHIVE_SCHEMA_VERSION = "phase5-v2";
const ARCHIVE_EXPORT_SCHEMA_VERSION = "phase5-export-v1";
const RANKING_SORT_KEY = "stock-monitor-ranking-sort-v1";
const SNAPSHOTS_MAX = 500;
const SAVED_SCREENS_MAX = 30;
const COMPARE_MAX = 4;
const AUTOSAVE_CAPTURE_LIMIT = 30;

type NotificationPermissionState = NotificationPermission | "unsupported";
type ExportSelection = {
  compareSelection?: boolean;
  snapshots?: boolean;
  alertEvents?: boolean;
  savedScreens?: boolean;
  backtestResults?: boolean;
  holdings?: boolean;
};

interface StockStore {
  stocks: EvaluatedStock[];
  registeredCodes: string[];
  registeredNameMap: Record<string, string>;
  filters: StockFilters;
  sortKey: SortKey;
  rankingSortKey: RankingSortKey;
  selectedStockId: string | null;
  detailOpen: boolean;
  dataMode: DataMode;
  lastUpdatedAt: string | null;
  fallbackStartedAt: string | null;
  error: string | null;
  fallbackReason: string | null;
  health: ProviderHealth[];
  isLoading: boolean;
  watchMap: Record<string, boolean>;
  holdingsMap: Record<string, number>;
  memoMap: Record<string, string>;
  hypothesisMap: Record<string, HypothesisLog>;
  alertRules: AlertRule[];
  alertEvents: AlertEvent[];
  previousSnapshots: Record<string, PreviousStockSnapshot>;
  alertConditionState: Record<string, boolean>;
  lastEvaluationAt: string | null;
  notificationsEnabled: boolean;
  notificationsAvailable: boolean;
  notificationPermission: NotificationPermissionState;
  scoringConfig: ScoringConfig;
  backtestResults: BacktestResult[];
  snapshots: StockSnapshot[];
  savedScreens: SavedScreen[];
  compareSelection: string[];
  autosaveSnapshots: boolean;
  refreshIntervalMinutes: number;
  autoRefreshEnabled: boolean;
  initialize: () => Promise<void>;
  refreshStocks: () => Promise<void>;
  registerSearchedStock: (payload: { code: string; name: string }) => Promise<{ ok: boolean; reason?: string }>;
  setFilters: (patch: Partial<StockFilters>) => void;
  resetFilters: () => void;
  setSortKey: (sortKey: SortKey) => void;
  setRankingSortKey: (sortKey: RankingSortKey) => void;
  openDetail: (stockId: string) => void;
  closeDetail: () => void;
  toggleWatch: (stockId: string) => void;
  saveMemo: (stockId: string, memo: string) => void;
  setHolding: (stockId: string, shares: number) => void;
  adjustHolding: (stockId: string, delta: number) => void;
  clearHoldings: () => void;
  saveHypothesis: (stockId: string, patch: Partial<HypothesisLog>) => void;
  addRule: (rule: Partial<Omit<AlertRule, "id" | "createdAt" | "updatedAt">>) => void;
  updateRule: (ruleId: string, patch: Partial<AlertRule>) => void;
  deleteRule: (ruleId: string) => void;
  addPresetRules: (presetId: AlertPresetId) => void;
  runAlertEvaluation: () => void;
  markAlertRead: (eventId: string) => void;
  dismissAlert: (eventId: string) => void;
  clearAlerts: () => void;
  toggleNotifications: () => void;
  setScoringConfig: (patch: Partial<ScoringConfig>) => void;
  resetScoringConfig: () => void;
  runBacktest: (params?: BacktestRunParams) => void;
  clearBacktestResults: () => void;
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
  exportData: (selection?: ExportSelection) => void;
  exportSnapshotsCsv: () => void;
  exportRankingCsv: (rows?: EvaluatedStock[]) => void;
  exportPortfolioCsv: () => void;
  importData: (payload: ExportPayload, options: ImportOptions) => ImportResult;
  importCsvWatchlist: (rows: { code: string; name?: string }[]) => CsvImportResult;
  setRefreshInterval: (minutes: number) => void;
  setAutoRefresh: (enabled: boolean) => void;
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function evaluateStocks(stocks: Stock[], scoringConfig: ScoringConfig): EvaluatedStock[] {
  return stocks.map((stock) => ({
    ...stock,
    ...evaluateStock(stock, scoringConfig)
  }));
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`[storage] failed to write key: ${key}`, error);
    return false;
  }
}

function readString(key: string, fallback: string): string {
  if (typeof window === "undefined") {
    return fallback;
  }
  const value = window.localStorage.getItem(key);
  return value ?? fallback;
}

function writeString(key: string, value: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[storage] failed to write key: ${key}`, error);
    return false;
  }
}

function notifyStorageFailure(operation: string): void {
  console.warn(`[storage] ${operation} failed to persist.`);
  if (typeof window !== "undefined" && typeof window.alert === "function") {
    window.alert("保存に失敗しました");
  }
}

function normalizeAlertRules(rules: AlertRule[]): AlertRule[] {
  return rules.map((rule) => ({
    ...rule,
    priority: rule.priority ?? "medium",
    dueDate: typeof rule.dueDate === "string" ? rule.dueDate : null
  }));
}

function normalizeAlertEvents(events: AlertEvent[]): AlertEvent[] {
  return [...events]
    .sort((a, b) => Date.parse(b.triggeredAt) - Date.parse(a.triggeredAt))
    .slice(0, 200);
}

function normalizeBacktestResults(results: BacktestResult[]): BacktestResult[] {
  return [...results]
    .sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt))
    .slice(0, BACKTEST_RESULTS_MAX);
}

function normalizeSavedScreens(screens: SavedScreen[]): SavedScreen[] {
  return [...screens]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, SAVED_SCREENS_MAX);
}

function normalizeCompareSelection(codes: string[]): string[] {
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

function normalizeRegisteredCodes(codes: string[]): string[] {
  const unique: string[] = [];
  for (const code of [...DEFAULT_STOCK_CODES, ...codes]) {
    if (!/^\d{4}$/.test(code) || unique.includes(code)) {
      continue;
    }
    unique.push(code);
    if (unique.length >= REGISTERED_CODES_MAX) {
      break;
    }
  }
  return unique.length > 0 ? unique : [...DEFAULT_STOCK_CODES];
}

function normalizeRegisteredNameMap(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object") {
    return {};
  }
  const map = input as Record<string, unknown>;
  const normalized: Record<string, string> = {};
  for (const [code, name] of Object.entries(map)) {
    if (!/^\d{4}$/.test(code) || typeof name !== "string" || !name.trim()) {
      continue;
    }
    normalized[code] = name.trim();
  }
  return normalized;
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

function safeRankingSortKey(value: string | null | undefined): RankingSortKey {
  if (isRankingSortKey(value)) {
    return value;
  }
  return "score_desc";
}

function summarizeProviderHealth(health: ProviderHealth[]): string {
  if (health.length === 0) {
    return "";
  }
  return health
    .map((item) => `${item.provider}:${item.ok ? "ok" : "failed"}`)
    .sort((a, b) => a.localeCompare(b))
    .join(",");
}

function toNullableNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function createSnapshot(
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

function safeSortKey(value: string): SortKey {
  const allowed: SortKey[] = [
    "score_desc",
    "price_asc",
    "price_desc",
    "revenue_growth_desc",
    "op_growth_desc"
  ];
  return allowed.includes(value as SortKey) ? (value as SortKey) : "score_desc";
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

function applySnapshotLimits(rows: StockSnapshot[]): StockSnapshot[] {
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

function migrateSnapshots(raw: unknown): StockSnapshot[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const valid = raw
    .map((item) => migrateSnapshotRecord(item))
    .filter((item): item is StockSnapshot => item !== null);
  return applySnapshotLimits(valid);
}

function migrateSavedScreens(raw: unknown): SavedScreen[] {
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
    const sortKey = typeof screen.sortKey === "string" ? screen.sortKey : "score_desc";
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

function downloadTextFile(fileName: string, content: string, mimeType: string): void {
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

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function sortStocksForRanking(
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

function readNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }
  return Notification.permission;
}

function isNotificationAvailable(permission: NotificationPermissionState): boolean {
  return permission === "granted";
}

function maybeSendBrowserNotification(events: AlertEvent[], notificationsEnabled: boolean): void {
  if (!notificationsEnabled || events.length === 0) {
    return;
  }
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return;
  }
  if (Notification.permission !== "granted") {
    return;
  }
  for (const event of events) {
    new Notification(event.title, {
      body: event.message,
      tag: event.dedupeKey ?? event.id
    });
  }
}

function sanitizeScoringConfig(input: Partial<ScoringConfig> | undefined): ScoringConfig {
  return {
    revenueGrowthThreshold: Number.isFinite(input?.revenueGrowthThreshold)
      ? Number(input!.revenueGrowthThreshold)
      : DEFAULT_SCORING_CONFIG.revenueGrowthThreshold,
    revenueGrowthWeight: Number.isFinite(input?.revenueGrowthWeight)
      ? Number(input!.revenueGrowthWeight)
      : DEFAULT_SCORING_CONFIG.revenueGrowthWeight,
    opGrowthThreshold: Number.isFinite(input?.opGrowthThreshold)
      ? Number(input!.opGrowthThreshold)
      : DEFAULT_SCORING_CONFIG.opGrowthThreshold,
    opGrowthWeight: Number.isFinite(input?.opGrowthWeight)
      ? Number(input!.opGrowthWeight)
      : DEFAULT_SCORING_CONFIG.opGrowthWeight,
    operatingCFBonus: Number.isFinite(input?.operatingCFBonus)
      ? Number(input!.operatingCFBonus)
      : DEFAULT_SCORING_CONFIG.operatingCFBonus,
    perPenaltyThreshold: Number.isFinite(input?.perPenaltyThreshold)
      ? Number(input!.perPenaltyThreshold)
      : DEFAULT_SCORING_CONFIG.perPenaltyThreshold,
    perPenaltyWeight: Number.isFinite(input?.perPenaltyWeight)
      ? Number(input!.perPenaltyWeight)
      : DEFAULT_SCORING_CONFIG.perPenaltyWeight,
    dilutionPenalty: Number.isFinite(input?.dilutionPenalty)
      ? Number(input!.dilutionPenalty)
      : DEFAULT_SCORING_CONFIG.dilutionPenalty,
    oneOffProfitPenalty: Number.isFinite(input?.oneOffProfitPenalty)
      ? Number(input!.oneOffProfitPenalty)
      : DEFAULT_SCORING_CONFIG.oneOffProfitPenalty
  };
}

function fallbackHistoryFromStock(stock: EvaluatedStock): HistoryDataPoint[] {
  return stock.chartData.map((point) => ({
    date: point.date,
    price: point.price,
    benchmark: point.benchmark,
    revenueGrowth: stock.revenueGrowth,
    opGrowth: stock.opGrowth,
    operatingCF: stock.operatingCF,
    per: stock.per,
    pbr: stock.pbr,
    dividendYield: stock.dividendYield,
    hasDilutionRisk: stock.hasDilutionRisk,
    hasOneOffProfitRisk: stock.hasOneOffProfitRisk
  }));
}

function initializeAlertStorage(): {
  alertRules: AlertRule[];
  alertEvents: AlertEvent[];
  previousSnapshots: Record<string, PreviousStockSnapshot>;
  alertConditionState: Record<string, boolean>;
  notificationsEnabled: boolean;
  notificationsAvailable: boolean;
  notificationPermission: NotificationPermissionState;
} {
  const permission = readNotificationPermission();
  const currentVersion = readString(ALERT_SCHEMA_VERSION_KEY, "");

  if (currentVersion !== ALERT_SCHEMA_VERSION) {
    const now = new Date().toISOString();
    const initialRules = normalizeAlertRules(createInitialAlertRules(now));
    writeJSON(ALERT_RULES_KEY, initialRules);
    writeJSON(ALERT_EVENTS_KEY, []);
    writeJSON(ALERT_SNAPSHOTS_KEY, {});
    writeJSON(ALERT_CONDITION_STATE_KEY, {});
    writeJSON(ALERT_NOTIFICATIONS_KEY, false);
    writeString(ALERT_SCHEMA_VERSION_KEY, ALERT_SCHEMA_VERSION);
    return {
      alertRules: initialRules,
      alertEvents: [],
      previousSnapshots: {},
      alertConditionState: {},
      notificationsEnabled: false,
      notificationsAvailable: isNotificationAvailable(permission),
      notificationPermission: permission
    };
  }

  const alertRules = normalizeAlertRules(readJSON<AlertRule[]>(ALERT_RULES_KEY, []));
  const alertEvents = normalizeAlertEvents(readJSON<AlertEvent[]>(ALERT_EVENTS_KEY, []));
  const previousSnapshots = readJSON<Record<string, PreviousStockSnapshot>>(ALERT_SNAPSHOTS_KEY, {});
  const alertConditionState = readJSON<Record<string, boolean>>(ALERT_CONDITION_STATE_KEY, {});
  const notificationsEnabledStored = readJSON<boolean>(ALERT_NOTIFICATIONS_KEY, false);
  const notificationsAvailable = isNotificationAvailable(permission);
  const notificationsEnabled = notificationsAvailable && notificationsEnabledStored;
  if (notificationsEnabled !== notificationsEnabledStored) {
    writeJSON(ALERT_NOTIFICATIONS_KEY, notificationsEnabled);
  }

  return {
    alertRules:
      alertRules.length > 0
        ? alertRules
        : normalizeAlertRules(createInitialAlertRules(new Date().toISOString())),
    alertEvents,
    previousSnapshots,
    alertConditionState,
    notificationsEnabled,
    notificationsAvailable,
    notificationPermission: permission
  };
}

function initializeBacktestStorage(): {
  scoringConfig: ScoringConfig;
  backtestResults: BacktestResult[];
} {
  const version = readString(BACKTEST_SCHEMA_VERSION_KEY, "");
  if (version !== BACKTEST_SCHEMA_VERSION) {
    writeJSON(SCORING_CONFIG_KEY, DEFAULT_SCORING_CONFIG);
    writeJSON(BACKTEST_RESULTS_KEY, []);
    writeString(BACKTEST_SCHEMA_VERSION_KEY, BACKTEST_SCHEMA_VERSION);
    return {
      scoringConfig: DEFAULT_SCORING_CONFIG,
      backtestResults: []
    };
  }

  const scoringConfig = sanitizeScoringConfig(readJSON<Partial<ScoringConfig>>(SCORING_CONFIG_KEY, {}));
  const backtestResults = normalizeBacktestResults(readJSON<BacktestResult[]>(BACKTEST_RESULTS_KEY, []));

  return {
    scoringConfig,
    backtestResults
  };
}

function initializeArchiveStorage(): {
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

export const useStockStore = create<StockStore>((set, get) => ({
  stocks: [],
  registeredCodes: [...DEFAULT_STOCK_CODES],
  registeredNameMap: {},
  filters: DEFAULT_FILTERS,
  sortKey: "score_desc",
  rankingSortKey: "score_desc",
  selectedStockId: null,
  detailOpen: false,
  dataMode: "mock",
  lastUpdatedAt: null,
  fallbackStartedAt: null,
  error: null,
  fallbackReason: null,
  health: [],
  isLoading: true,
  watchMap: {},
  holdingsMap: {},
  memoMap: {},
  hypothesisMap: {},
  alertRules: [],
  alertEvents: [],
  previousSnapshots: {},
  alertConditionState: {},
  lastEvaluationAt: null,
  notificationsEnabled: false,
  notificationsAvailable: false,
  notificationPermission: "unsupported",
  scoringConfig: DEFAULT_SCORING_CONFIG,
  backtestResults: [],
  snapshots: [],
  savedScreens: [],
  compareSelection: [],
  autosaveSnapshots: false,
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
  setRankingSortKey: (rankingSortKey) => {
    set({ rankingSortKey });
    const persisted = writeString(RANKING_SORT_KEY, rankingSortKey);
    if (!persisted) {
      notifyStorageFailure("setRankingSortKey");
    }
  },
  openDetail: (stockId) => {
    set({ selectedStockId: stockId, detailOpen: true });
  },
  closeDetail: () => {
    set({ detailOpen: false });
  },
  toggleWatch: (stockId) => {
    set((state) => {
      const current = state.watchMap[stockId] ?? false;
      const nextWatchMap = { ...state.watchMap, [stockId]: !current };
      writeJSON(WATCH_KEY, nextWatchMap);

      const nextStocks = state.stocks.map((stock) =>
        stock.id === stockId ? { ...stock, watched: !current } : stock
      );

      return { watchMap: nextWatchMap, stocks: nextStocks };
    });
  },
  saveMemo: (stockId, memo) => {
    set((state) => {
      const nextMemoMap = { ...state.memoMap, [stockId]: memo };
      writeJSON(MEMO_KEY, nextMemoMap);

      const nextStocks = state.stocks.map((stock) =>
        stock.id === stockId ? { ...stock, memo } : stock
      );

      return { memoMap: nextMemoMap, stocks: nextStocks };
    });
  },
  setHolding: (stockId, shares) => {
    const clamped = Math.max(0, Math.floor(shares));
    set((state) => {
      const nextHoldingsMap = { ...state.holdingsMap, [stockId]: clamped };
      writeJSON(HOLDINGS_KEY, nextHoldingsMap);
      return { holdingsMap: nextHoldingsMap };
    });
  },
  adjustHolding: (stockId, delta) => {
    set((state) => {
      const current = state.holdingsMap[stockId] ?? 0;
      const next = Math.max(0, current + delta);
      const nextHoldingsMap = { ...state.holdingsMap, [stockId]: next };
      writeJSON(HOLDINGS_KEY, nextHoldingsMap);
      return { holdingsMap: nextHoldingsMap };
    });
  },
  clearHoldings: () => {
    writeJSON(HOLDINGS_KEY, {});
    set({ holdingsMap: {} });
  },
  saveHypothesis: (stockId, patch) => {
    set((state) => {
      const current = state.hypothesisMap[stockId] ?? {
        hypothesis: "",
        rationale: "",
        reviewDate: "",
        outcome: "",
        updatedAt: ""
      };
      const next: HypothesisLog = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString()
      };
      const hypothesisMap = { ...state.hypothesisMap, [stockId]: next };
      const persisted = writeJSON(HYPOTHESIS_KEY, hypothesisMap);
      if (!persisted) {
        notifyStorageFailure("saveHypothesis");
      }
      return { hypothesisMap };
    });
  },
  addRule: (ruleInput) => {
    if (ruleInput.scope === "stock" && !ruleInput.stockCode) {
      return;
    }
    const now = new Date().toISOString();
    const type = ruleInput.type ?? "score_delta";
    const next: AlertRule = {
      id: createId("rule"),
      stockCode: ruleInput.stockCode,
      scope: ruleInput.scope ?? "global",
      type,
      enabled: ruleInput.enabled ?? true,
      threshold:
        typeof ruleInput.threshold === "number"
          ? ruleInput.threshold
          : defaultRuleThreshold(type),
      messageTemplate: ruleInput.messageTemplate,
      cooldownMinutes: ruleInput.cooldownMinutes ?? 30,
      priority: ruleInput.priority ?? "medium",
      dueDate:
        typeof ruleInput.dueDate === "string" && ruleInput.dueDate.trim()
          ? ruleInput.dueDate
          : null,
      createdAt: now,
      updatedAt: now
    };
    set((state) => {
      const alertRules = normalizeAlertRules([next, ...state.alertRules]);
      writeJSON(ALERT_RULES_KEY, alertRules);
      return { alertRules };
    });
  },
  updateRule: (ruleId, patch) => {
    set((state) => {
      const alertRules = normalizeAlertRules(state.alertRules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...patch, updatedAt: new Date().toISOString() } : rule
      ));
      writeJSON(ALERT_RULES_KEY, alertRules);
      return { alertRules };
    });
  },
  deleteRule: (ruleId) => {
    set((state) => {
      const alertRules = state.alertRules.filter((rule) => rule.id !== ruleId);
      writeJSON(ALERT_RULES_KEY, alertRules);
      return { alertRules };
    });
  },
  addPresetRules: (presetId) => {
    if (!ALERT_PRESET_CATALOG[presetId]) {
      return;
    }
    set((state) => {
      const now = new Date().toISOString();
      const created = createRulesFromPreset(presetId, now);
      const existingFingerprints = new Set(
        state.alertRules.map(
          (rule) => `${rule.scope}|${rule.type}|${rule.stockCode ?? ""}|${rule.threshold ?? ""}`
        )
      );
      const deduped = created.filter((rule) => {
        const key = `${rule.scope}|${rule.type}|${rule.stockCode ?? ""}|${rule.threshold ?? ""}`;
        if (existingFingerprints.has(key)) {
          return false;
        }
        existingFingerprints.add(key);
        return true;
      });
      const alertRules = normalizeAlertRules([...deduped, ...state.alertRules]);
      writeJSON(ALERT_RULES_KEY, alertRules);
      return { alertRules };
    });
  },
  runAlertEvaluation: () => {
    const state = get();
    if (state.stocks.length === 0 || state.alertRules.length === 0) {
      return;
    }
    const checkedAt = new Date().toISOString();
    const result = evaluateAlerts({
      stocks: state.stocks,
      rules: state.alertRules,
      existingEvents: state.alertEvents,
      previousSnapshots: state.previousSnapshots,
      conditionState: state.alertConditionState,
      dataMode: state.dataMode,
      health: state.health,
      checkedAt
    });

    const alertEvents = normalizeAlertEvents(result.events);
    set({
      alertEvents,
      previousSnapshots: result.snapshots,
      alertConditionState: result.conditionState,
      lastEvaluationAt: result.lastEvaluationAt
    });

    writeJSON(ALERT_EVENTS_KEY, alertEvents);
    writeJSON(ALERT_SNAPSHOTS_KEY, result.snapshots);
    writeJSON(ALERT_CONDITION_STATE_KEY, result.conditionState);

    maybeSendBrowserNotification(result.triggeredEvents, state.notificationsEnabled);
  },
  markAlertRead: (eventId) => {
    set((state) => {
      const alertEvents = state.alertEvents.map((event) =>
        event.id === eventId ? { ...event, read: true } : event
      );
      writeJSON(ALERT_EVENTS_KEY, alertEvents);
      return { alertEvents };
    });
  },
  dismissAlert: (eventId) => {
    set((state) => {
      const alertEvents = state.alertEvents.map((event) =>
        event.id === eventId ? { ...event, dismissed: true, read: true } : event
      );
      writeJSON(ALERT_EVENTS_KEY, alertEvents);
      return { alertEvents };
    });
  },
  clearAlerts: () => {
    set(() => {
      const eventsPersisted = writeJSON(ALERT_EVENTS_KEY, []);
      const snapshotsPersisted = writeJSON(ALERT_SNAPSHOTS_KEY, {});
      const statePersisted = writeJSON(ALERT_CONDITION_STATE_KEY, {});
      if (!eventsPersisted || !snapshotsPersisted || !statePersisted) {
        notifyStorageFailure("clearAlerts");
      }
      return {
        alertEvents: [],
        previousSnapshots: {},
        alertConditionState: {},
        lastEvaluationAt: null
      };
    });
  },
  toggleNotifications: () => {
    set((state) => {
      const permission = readNotificationPermission();
      const notificationsAvailable = isNotificationAvailable(permission);
      if (state.notificationsEnabled) {
        writeJSON(ALERT_NOTIFICATIONS_KEY, false);
        return {
          notificationsEnabled: false,
          notificationsAvailable,
          notificationPermission: permission
        };
      }

      if (permission === "granted") {
        writeJSON(ALERT_NOTIFICATIONS_KEY, true);
        return {
          notificationsEnabled: true,
          notificationsAvailable: true,
          notificationPermission: permission
        };
      }

      if (
        typeof window !== "undefined" &&
        typeof Notification !== "undefined" &&
        Notification.permission === "default"
      ) {
        void Notification.requestPermission().then((requestedPermission) => {
          const granted = requestedPermission === "granted";
          writeJSON(ALERT_NOTIFICATIONS_KEY, granted);
          set({
            notificationsEnabled: granted,
            notificationsAvailable: isNotificationAvailable(requestedPermission),
            notificationPermission: requestedPermission
          });
        });
      } else {
        writeJSON(ALERT_NOTIFICATIONS_KEY, false);
      }

      return {
        notificationsEnabled: false,
        notificationsAvailable,
        notificationPermission: permission
      };
    });
  },
  setScoringConfig: (patch) => {
    set((state) => {
      const scoringConfig = sanitizeScoringConfig({ ...state.scoringConfig, ...patch });
      const stocks = state.stocks.map((stock) => ({
        ...stock,
        ...evaluateStock(stock, scoringConfig)
      }));
      const checkedAt = state.lastUpdatedAt ?? new Date().toISOString();
      const previousSnapshots = buildAlertSnapshots(stocks, state.dataMode, state.health, checkedAt);
      const alertConditionState = buildAlertConditionBaseline({
        stocks,
        rules: state.alertRules,
        dataMode: state.dataMode,
        health: state.health,
        checkedAt,
        previousSnapshots
      });
      writeJSON(SCORING_CONFIG_KEY, scoringConfig);
      writeJSON(ALERT_SNAPSHOTS_KEY, previousSnapshots);
      writeJSON(ALERT_CONDITION_STATE_KEY, alertConditionState);
      return { scoringConfig, stocks, previousSnapshots, alertConditionState };
    });
  },
  resetScoringConfig: () => {
    set((state) => {
      const scoringConfig = DEFAULT_SCORING_CONFIG;
      const stocks = state.stocks.map((stock) => ({
        ...stock,
        ...evaluateStock(stock, scoringConfig)
      }));
      const checkedAt = state.lastUpdatedAt ?? new Date().toISOString();
      const previousSnapshots = buildAlertSnapshots(stocks, state.dataMode, state.health, checkedAt);
      const alertConditionState = buildAlertConditionBaseline({
        stocks,
        rules: state.alertRules,
        dataMode: state.dataMode,
        health: state.health,
        checkedAt,
        previousSnapshots
      });
      writeJSON(SCORING_CONFIG_KEY, scoringConfig);
      writeJSON(ALERT_SNAPSHOTS_KEY, previousSnapshots);
      writeJSON(ALERT_CONDITION_STATE_KEY, alertConditionState);
      return { scoringConfig, stocks, previousSnapshots, alertConditionState };
    });
  },
  runBacktest: (params) => {
    const state = get();
    if (state.stocks.length === 0) {
      return;
    }

    const mode = params?.mode ?? "single_stock";
    const selectedCode =
      state.stocks.find((stock) => stock.id === state.selectedStockId)?.code ?? state.stocks[0]?.code;
    const targetCode = params?.stockCode ?? selectedCode;

    let result: BacktestResult;

    if (mode === "watchlist") {
      const historyByCode: Record<string, HistoryDataPoint[]> = {};
      for (const stock of state.stocks) {
        const sample = getSampleHistoryForStock(stock.code);
        historyByCode[stock.code] = sample.length > 0 ? sample : fallbackHistoryFromStock(stock);
      }
      result = runWatchlistBacktest({
        stocks: state.stocks,
        historyByCode,
        config: state.scoringConfig,
        startDate: params?.startDate,
        endDate: params?.endDate
      });
    } else {
      const stock = state.stocks.find((item) => item.code === targetCode);
      if (!stock) {
        return;
      }
      const sample = getSampleHistoryForStock(stock.code);
      const history = sample.length > 0 ? sample : fallbackHistoryFromStock(stock);
      result = runSingleStockBacktest({
        stock,
        history,
        config: state.scoringConfig,
        startDate: params?.startDate,
        endDate: params?.endDate
      });
    }

    const backtestResults = normalizeBacktestResults([result, ...state.backtestResults]);
    set({ backtestResults });
    writeJSON(BACKTEST_RESULTS_KEY, backtestResults);
  },
  clearBacktestResults: () => {
    set(() => {
      writeJSON(BACKTEST_RESULTS_KEY, []);
      return { backtestResults: [] };
    });
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
      const patch: Partial<StockStore> = {};

      if (options.targets.snapshots && payload.snapshots) {
        const valid = payload.snapshots.filter(
          (s) => typeof s.code === "string" && typeof s.name === "string" && typeof s.checkedAt === "string"
        ) as StockSnapshot[];
        if (options.mergeStrategy === "overwrite") {
          const snapshots = applySnapshotLimits(valid);
          patch.snapshots = snapshots;
          imported += snapshots.length;
        } else if (options.mergeStrategy === "append") {
          const existingIds = new Set(state.snapshots.map((s) => s.id));
          const newItems = valid.filter((s) => !existingIds.has(s.id));
          const snapshots = applySnapshotLimits([...state.snapshots, ...newItems]);
          imported += newItems.length;
          skipped += valid.length - newItems.length;
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
        } else {
          const existingIds = new Set(state.alertEvents.map((e) => e.id));
          const newItems = valid.filter((e) => !existingIds.has(e.id));
          patch.alertEvents = options.mergeStrategy === "append"
            ? [...state.alertEvents, ...newItems]
            : [...state.alertEvents, ...newItems];
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
}));

export function useSelectedStock(): EvaluatedStock | null {
  return useStockStore((state) => {
    if (!state.selectedStockId) {
      return null;
    }
    return state.stocks.find((stock) => stock.id === state.selectedStockId) ?? null;
  });
}

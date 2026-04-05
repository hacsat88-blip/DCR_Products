/**
 * Shared helpers for store slices — localStorage I/O, ID generation, normalization.
 * These are pure functions with no Zustand dependency.
 */

import {
  ALERT_PRESET_CATALOG,
  AlertPresetId,
  createInitialAlertRules,
  createRulesFromPreset,
  defaultRuleThreshold
} from "@/lib/alertPresets";
import { DEFAULT_FILTERS } from "@/lib/filters";
import { DEFAULT_SCORING_CONFIG, evaluateStock } from "@/lib/scoring";
import { DEFAULT_STOCK_CODES, DataMode, ProviderHealth } from "@/services/providers/types";
import { AlertEvent, AlertRule, PreviousStockSnapshot } from "@/types/alert";
import { BacktestResult, HistoryDataPoint } from "@/types/backtest";
import { RankingSortKey, SavedScreen, StockSnapshot } from "@/types/archive";
import { ScoringConfig } from "@/types/scoring";
import { EvaluatedStock, Stock } from "@/types/stock";

// ── localStorage keys ──────────────────────────────────────────────
export const WATCH_KEY = "stock-monitor-watch-v1";
export const HOLDINGS_KEY = "stock-monitor-holdings-v1";
export const MEMO_KEY = "stock-monitor-memo-v1";
export const HYPOTHESIS_KEY = "stock-monitor-hypothesis-v1";

export const ALERT_RULES_KEY = "stock-monitor-alert-rules-v1";
export const ALERT_EVENTS_KEY = "stock-monitor-alert-events-v1";
export const ALERT_SNAPSHOTS_KEY = "stock-monitor-alert-snapshots-v1";
export const ALERT_CONDITION_STATE_KEY = "stock-monitor-alert-condition-state-v1";
export const ALERT_NOTIFICATIONS_KEY = "stock-monitor-alert-notifications-v1";
export const ALERT_SCHEMA_VERSION_KEY = "stock-monitor-alert-schema-version";
export const ALERT_SCHEMA_VERSION = "phase3-v1";

export const SCORING_CONFIG_KEY = "stock-monitor-scoring-config-v1";
export const BACKTEST_RESULTS_KEY = "stock-monitor-backtest-results-v1";
export const BACKTEST_SCHEMA_VERSION_KEY = "stock-monitor-backtest-schema-version";
export const BACKTEST_SCHEMA_VERSION = "phase4-v1";
export const BACKTEST_RESULTS_MAX = 20;

export const REGISTERED_CODES_KEY = "stock-monitor-registered-codes-v1";
export const REGISTERED_NAME_MAP_KEY = "stock-monitor-registered-name-map-v1";
export const REGISTERED_CODES_MAX = 30;

export const REFRESH_INTERVAL_KEY = "stock-monitor-refresh-interval-v1";
export const AUTO_REFRESH_KEY = "stock-monitor-auto-refresh-v1";

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

// ── localStorage I/O ───────────────────────────────────────────────
export function readJSON<T>(key: string, fallback: T): T {
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

export function writeJSON<T>(key: string, value: T): boolean {
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

export function readString(key: string, fallback: string): string {
  if (typeof window === "undefined") {
    return fallback;
  }
  const value = window.localStorage.getItem(key);
  return value ?? fallback;
}

export function writeString(key: string, value: string): boolean {
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

export function notifyStorageFailure(operation: string): void {
  console.warn(`[storage] ${operation} failed to persist.`);
  if (typeof window !== "undefined" && typeof window.alert === "function") {
    window.alert("保存に失敗しました");
  }
}

// ── ID generation ──────────────────────────────────────────────────
export function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ── Scoring ────────────────────────────────────────────────────────
export function evaluateStocks(stocks: Stock[], scoringConfig: ScoringConfig): EvaluatedStock[] {
  return stocks.map((stock) => ({
    ...stock,
    ...evaluateStock(stock, scoringConfig)
  }));
}

// ── Alert normalization ────────────────────────────────────────────
export function normalizeAlertRules(rules: AlertRule[]): AlertRule[] {
  return rules.map((rule) => ({
    ...rule,
    priority: rule.priority ?? "medium",
    dueDate: typeof rule.dueDate === "string" ? rule.dueDate : null
  }));
}

export function normalizeAlertEvents(events: AlertEvent[]): AlertEvent[] {
  return [...events]
    .sort((a, b) => Date.parse(b.triggeredAt) - Date.parse(a.triggeredAt))
    .slice(0, 200);
}

// ── Backtest normalization ─────────────────────────────────────────
export function normalizeBacktestResults(results: BacktestResult[]): BacktestResult[] {
  return [...results]
    .sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt))
    .slice(0, BACKTEST_RESULTS_MAX);
}

// ── Registration normalization ─────────────────────────────────────
export function normalizeRegisteredCodes(codes: string[]): string[] {
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

export function normalizeRegisteredNameMap(input: unknown): Record<string, string> {
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

// ── Saved screens normalization ────────────────────────────────────
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

// ── Ranking sort ───────────────────────────────────────────────────
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

// ── Provider health summary ────────────────────────────────────────
export function summarizeProviderHealth(health: ProviderHealth[]): string {
  if (health.length === 0) {
    return "";
  }
  return health
    .map((item) => `${item.provider}:${item.ok ? "ok" : "failed"}`)
    .sort((a, b) => a.localeCompare(b))
    .join(",");
}

// ── Nullable number ────────────────────────────────────────────────
export function toNullableNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// ── Snapshot helpers ───────────────────────────────────────────────
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

export function safeSortKey(value: string): import("@/types/stock").SortKey {
  const allowed: import("@/types/stock").SortKey[] = [
    "score_desc",
    "price_asc",
    "price_desc",
    "revenue_growth_desc",
    "op_growth_desc"
  ];
  return allowed.includes(value as import("@/types/stock").SortKey)
    ? (value as import("@/types/stock").SortKey)
    : "score_desc";
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

// ── Download / CSV helpers ─────────────────────────────────────────
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

// ── Ranking sort logic ─────────────────────────────────────────────
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

// ── Notification helpers ───────────────────────────────────────────
export type NotificationPermissionState = NotificationPermission | "unsupported";

export function readNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }
  return Notification.permission;
}

export function isNotificationAvailable(permission: NotificationPermissionState): boolean {
  return permission === "granted";
}

export function maybeSendBrowserNotification(events: AlertEvent[], notificationsEnabled: boolean): void {
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

// ── Scoring config sanitization ────────────────────────────────────
export function sanitizeScoringConfig(input: Partial<ScoringConfig> | undefined): ScoringConfig {
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

// ── Backtest history fallback ──────────────────────────────────────
export function fallbackHistoryFromStock(stock: EvaluatedStock): HistoryDataPoint[] {
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

// ── Alert storage initialization ───────────────────────────────────
export function initializeAlertStorage(): {
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

// ── Backtest storage initialization ────────────────────────────────
export function initializeBacktestStorage(): {
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

// ── Archive storage initialization ─────────────────────────────────
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

// Re-exports used by slices
export {
  ALERT_PRESET_CATALOG,
  createInitialAlertRules,
  createRulesFromPreset,
  defaultRuleThreshold,
  DEFAULT_FILTERS,
  DEFAULT_SCORING_CONFIG,
  evaluateStock,
  DEFAULT_STOCK_CODES
};
export type { AlertPresetId };

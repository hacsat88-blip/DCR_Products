import { DEFAULT_FILTERS } from "@/lib/filters";
import { evaluateStock } from "@/lib/scoring";
import { DEFAULT_STOCK_CODES } from "@/services/providers/types";
import { ScoringConfig } from "@/types/scoring";
import { EvaluatedStock, SortKey, Stock } from "@/types/stock";
import { RegisteredStockProfile, RegisteredStockProfileMap } from "@/types/stockProfile";

export const WATCH_KEY = "stock-monitor-watch-v1";
export const HOLDINGS_KEY = "stock-monitor-holdings-v1";
export const MEMO_KEY = "stock-monitor-memo-v1";
export const HYPOTHESIS_KEY = "stock-monitor-hypothesis-v1";

export const REGISTERED_CODES_KEY = "stock-monitor-registered-codes-v1";
export const REGISTERED_NAME_MAP_KEY = "stock-monitor-registered-name-map-v1";
export const REGISTERED_PROFILE_MAP_KEY = "stock-monitor-registered-profile-map-v1";
export const REGISTERED_CODES_MAX = 30;

export const REFRESH_INTERVAL_KEY = "stock-monitor-refresh-interval-v1";
export const AUTO_REFRESH_KEY = "stock-monitor-auto-refresh-v1";

export function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function evaluateStocks(stocks: Stock[], scoringConfig: ScoringConfig): EvaluatedStock[] {
  return stocks.map((stock) => ({
    ...stock,
    ...evaluateStock(stock, scoringConfig)
  }));
}

export function normalizeRegisteredCodes(
  codes: string[],
  options: {
    includeDefaults?: boolean;
    fallbackToDefaults?: boolean;
  } = {}
): string[] {
  const { includeDefaults = true, fallbackToDefaults = true } = options;
  const unique: string[] = [];
  const source = includeDefaults ? [...DEFAULT_STOCK_CODES, ...codes] : codes;
  for (const code of source) {
    if (!/^\d{4}$/.test(code) || unique.includes(code)) {
      continue;
    }
    unique.push(code);
    if (unique.length >= REGISTERED_CODES_MAX) {
      break;
    }
  }
  return unique.length > 0 || !fallbackToDefaults ? unique : [...DEFAULT_STOCK_CODES];
}

export function omitRecordKeys<T>(map: Record<string, T>, keys: Iterable<string>): Record<string, T> {
  const next = { ...map };
  let changed = false;

  for (const key of keys) {
    if (key in next) {
      delete next[key];
      changed = true;
    }
  }

  return changed ? next : map;
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

export function normalizeRegisteredProfileMap(input: unknown): RegisteredStockProfileMap {
  if (!input || typeof input !== "object") {
    return {};
  }
  const map = input as Record<string, unknown>;
  const normalized: RegisteredStockProfileMap = {};

  for (const [code, value] of Object.entries(map)) {
    if (!/^\d{4}$/.test(code) || !value || typeof value !== "object") {
      continue;
    }

    const candidate = value as Record<string, unknown>;
    const oneLiner = typeof candidate.oneLiner === "string" ? candidate.oneLiner.trim() : "";
    const summary = typeof candidate.summary === "string" ? candidate.summary.trim() : "";
    if (!oneLiner && !summary) {
      continue;
    }

    const sector =
      typeof candidate.sector === "string" && candidate.sector.trim() ? candidate.sector.trim() : null;
    const backfillState = candidate.backfillState === "unavailable" ? "unavailable" : "resolved";
    const updatedAt =
      typeof candidate.updatedAt === "string" && candidate.updatedAt.trim()
        ? candidate.updatedAt
        : new Date(0).toISOString();

    normalized[code] = {
      sector,
      oneLiner: oneLiner || summary,
      summary: summary || oneLiner,
      backfillState,
      updatedAt
    };
  }

  return normalized;
}

export function applyRegisteredProfile<T extends Stock>(
  stock: T,
  profile: RegisteredStockProfile | null | undefined
): T {
  if (!stock.id.startsWith("live-") || !profile) {
    return stock;
  }

  return {
    ...stock,
    sector: stock.sector === "未分類" && profile.sector ? profile.sector : stock.sector,
    oneLiner: profile.oneLiner.trim() || stock.oneLiner,
    summary: profile.summary.trim() || stock.summary
  };
}

export function safeSortKey(value: string): SortKey {
  const allowed: SortKey[] = [
    "score_desc",
    "price_asc",
    "price_desc",
    "revenue_growth_desc",
    "op_growth_desc"
  ];
  return allowed.includes(value as SortKey) ? (value as SortKey) : "score_desc";
}

export { DEFAULT_FILTERS, DEFAULT_STOCK_CODES, evaluateStock };

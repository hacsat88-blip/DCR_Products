import { Stock } from "@/types/stock";
import { SourceLabel, StockSourceMeta } from "@/types/source";

export type DataMode = "mock" | "live" | "fallback";

export const DEFAULT_STOCK_CODES = ["9424", "2337", "4477", "4419"] as const;

export interface Quote {
  code: string;
  name: string | null;
  price: number | null;
  changePercent: number | null;
  sourceTimestamp?: string | null;
  sourceLabel?: SourceLabel | null;
  sector?: string | null;
  marketCap?: number | null;
  per?: number | null;
  pbr?: number | null;
  dividendYield?: number | null;
}

export interface Fundamentals {
  code: string;
  revenueGrowth: number | null;
  opGrowth: number | null;
  operatingCF: number | null;
  sourceTimestamp?: string | null;
  sourceLabel?: SourceLabel | null;
  sector?: string | null;
  marketCap?: number | null;
  per?: number | null;
  pbr?: number | null;
  dividendYield?: number | null;
}

export type ProviderName = "jquants" | "edinetDb" | "yahoo" | "alphaVantage";
export type MarketSourceName = "yahoo_finance" | "alpha_vantage" | "jquants";

export type ProviderErrorCode = "auth_failure" | "rate_limit" | "network" | "parse_error" | "timeout" | null;
export type ProviderDecision = "used" | "not_required" | "deferred" | "disabled" | "failed" | "route_fallback";
export type ProviderFallbackOrder = {
  quotes: Array<ProviderName | "mock">;
  fundamentals: Array<ProviderName | "mock">;
};

export interface ProviderHealth {
  provider: ProviderName;
  ok: boolean;
  message: string | null;
  decision?: ProviderDecision;
  errorCode: ProviderErrorCode;
  latencyMs: number | null;
  fetchedAt: string | null;
  sourceTimestamp: string | null;
  sourceLabel: SourceLabel | null;
  cumulativeCalls?: number | null;
}

export interface StockFetchResult {
  stocks: Stock[];
  dataMode: DataMode;
  sourceLabel?: SourceLabel | null;
  sourceMeta?: StockSourceMeta;
  providerOrder?: ProviderFallbackOrder;
  lastUpdatedAt: string;
  error: string | null;
  fallbackReason: string | null;
  health: ProviderHealth[];
}

export interface QuoteProvider {
  getQuotes(codes: string[]): Promise<Quote[]>;
}

export interface FundamentalsProvider {
  getFundamentals(codes: string[]): Promise<Fundamentals[]>;
}

export interface StockDataProvider {
  getStocks(codes: string[]): Promise<Stock[]>;
}

const PROVIDER_LABELS = {
  short: {
    yahoo: "価格(YF)",
    alphaVantage: "価格(AV)",
    jquants: "価格(JQ)",
    edinetDb: "財務",
  },
  long: {
    yahoo: "価格データ（Yahoo Finance）",
    alphaVantage: "価格データ（Alpha Vantage fallback）",
    jquants: "価格データ（J-Quants）",
    edinetDb: "財務データ（EDINET DB）",
  },
} as const;

const MARKET_SOURCE_ALIASES: Record<string, MarketSourceName> = {
  yahoo: "yahoo_finance",
  yf: "yahoo_finance",
  yahoo_finance: "yahoo_finance",
  "yahoo finance ^n225": "yahoo_finance",
  alpha_vantage: "alpha_vantage",
  av: "alpha_vantage",
  "alpha vantage": "alpha_vantage",
  alphavantage: "alpha_vantage",
  jquants: "jquants",
};

const MARKET_SOURCE_LABELS: Record<MarketSourceName, string> = {
  yahoo_finance: "Yahoo Finance",
  alpha_vantage: "Alpha Vantage",
  jquants: "J-Quants",
};

export function getProviderLabel(provider: ProviderName, format: "short" | "long" = "short"): string {
  return PROVIDER_LABELS[format][provider];
}

export function normalizeMarketSourceName(source: string | null | undefined): MarketSourceName | null {
  if (!source) {
    return null;
  }
  const normalized = MARKET_SOURCE_ALIASES[source.trim().toLowerCase()];
  return normalized ?? null;
}

export function getMarketSourceLabel(source: string | null | undefined): string | null {
  const normalized = normalizeMarketSourceName(source);
  if (!normalized) {
    if (!source || !source.trim()) {
      return null;
    }
    return source;
  }
  return MARKET_SOURCE_LABELS[normalized];
}

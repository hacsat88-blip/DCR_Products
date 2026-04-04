import { Stock } from "@/types/stock";

export type DataMode = "mock" | "live" | "fallback";

export const DEFAULT_STOCK_CODES = ["9424", "2337", "4477", "4419"] as const;

export interface Quote {
  code: string;
  name: string | null;
  price: number | null;
  changePercent: number | null;
  sourceTimestamp?: string | null;
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
  sourceLabel?: string | null;
  sector?: string | null;
  marketCap?: number | null;
  per?: number | null;
  pbr?: number | null;
  dividendYield?: number | null;
}

export type ProviderName = "jquants" | "edinetDb" | "yahoo";

export type ProviderErrorCode = "auth_failure" | "rate_limit" | "network" | "parse_error" | "timeout" | null;

export interface ProviderHealth {
  provider: ProviderName;
  ok: boolean;
  message: string | null;
  errorCode: ProviderErrorCode;
  latencyMs: number | null;
  fetchedAt: string | null;
  sourceTimestamp: string | null;
  sourceLabel: string | null;
}

export interface StockFetchResult {
  stocks: Stock[];
  dataMode: DataMode;
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

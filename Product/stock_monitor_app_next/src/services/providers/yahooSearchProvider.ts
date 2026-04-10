// ────────────────────────────────────────────────
// Yahoo Finance Search Provider
// ────────────────────────────────────────────────
//
// Uses Yahoo Finance's public search endpoint to find stocks
// by ticker, company name, or sector. No API key required.
// Falls back gracefully on failure so callers always get a result.

import { stockCatalog } from "@/data/stockCatalog";
import type { StockSearchResult } from "@/types/search";

const YAHOO_SEARCH_ENDPOINT = "https://query2.finance.yahoo.com/v1/finance/search";
const FETCH_TIMEOUT_MS = 8_000;
const MAX_RESULTS = 12;

/** Lookup map: stock code → Japanese name from local catalog. */
const catalogNameMap = new Map<string, string>(
  stockCatalog.map((e) => [e.code, e.name]),
);
/** Lookup map: stock code → sector from local catalog. */
const catalogSectorMap = new Map<string, string | null>(
  stockCatalog.map((e) => [e.code, e.sector]),
);

/** Yahoo search API response shape (partial). */
interface YahooSearchQuote {
  symbol: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  exchDisp?: string;
}

interface YahooSearchResponse {
  quotes?: YahooSearchQuote[];
}

/**
 * Determines whether a Yahoo symbol represents a Japanese stock.
 * Japanese stocks end with `.T` (TSE) or have Tokyo-related exchange info.
 */
function isJapaneseStock(quote: YahooSearchQuote): boolean {
  const symbol = quote.symbol ?? "";
  const exchange = (quote.exchange ?? "").toUpperCase();
  const exchDisp = (quote.exchDisp ?? "").toUpperCase();
  return (
    symbol.endsWith(".T") ||
    exchange.includes("JPX") ||
    exchange.includes("TYO") ||
    exchange.includes("TSE") ||
    exchDisp.includes("TOKYO") ||
    exchDisp.includes("東京")
  );
}

/**
 * Extracts a 4-digit stock code from a Yahoo symbol like "9424.T".
 * Returns null if the symbol doesn't match the expected pattern.
 */
function extractJpCode(symbol: string): string | null {
  const match = symbol.match(/^(\d{4})\.T$/);
  return match ? match[1] : null;
}

/** 取引所表示名の英語→日本語マッピング */
const EXCH_DISP_JP: Record<string, string> = {
  TOKYO: "東証",
  JPX: "東証",
  TYO: "東証",
  TSE: "東証",
  OSAKA: "大証",
  NAGOYA: "名証",
  SAPPORO: "札証",
  FUKUOKA: "福証",
  NYSE: "NYSE",
  NASDAQ: "NASDAQ",
  AMEX: "AMEX",
};

/** クオートタイプの英語→日本語マッピング */
const QUOTE_TYPE_JP: Record<string, string> = {
  EQUITY: "株式",
  ETF: "ETF",
};

/**
 * Determines the display name for a search result.
 * Prefers local catalog Japanese name → Yahoo shortname → symbol.
 */
function displayName(quote: YahooSearchQuote, code: string): string {
  // Prefer local catalog Japanese name if available
  const catalogName = catalogNameMap.get(code);
  if (catalogName) return catalogName;
  // shortname は longname より短く表示しやすい
  return quote.shortname || quote.longname || quote.symbol;
}

/**
 * Builds a Japanese-friendly one-liner description for a search result.
 * Example: "東証 株式", "NASDAQ ETF"
 */
function buildOneLiner(quote: YahooSearchQuote): string {
  const rawExch = (quote.exchDisp ?? "").toUpperCase();
  const rawType = (quote.quoteType ?? "").toUpperCase();
  // Exact match first, then prefix match (e.g. "TOKYO STOCK EXCHANGE" → "TOKYO" → "東証")
  const exch =
    EXCH_DISP_JP[rawExch] ??
    EXCH_DISP_JP[Object.keys(EXCH_DISP_JP).find((k) => rawExch.startsWith(k)) ?? ""] ??
    quote.exchDisp ??
    null;
  const type = QUOTE_TYPE_JP[rawType] ?? rawType;
  return exch ? `${exch} ${type}` : type;
}

/**
 * Converts a Yahoo search quote into our StockSearchResult format.
 */
function toSearchResult(
  quote: YahooSearchQuote,
  registeredCodes: Set<string>,
): StockSearchResult | null {
  const isJp = isJapaneseStock(quote);
  const code = isJp ? extractJpCode(quote.symbol) ?? quote.symbol : quote.symbol;

  // Skip non-equity types (mutual funds, futures, etc. unless ETF)
  const quoteType = (quote.quoteType ?? "").toUpperCase();
  if (!["EQUITY", "ETF"].includes(quoteType)) {
    return null;
  }

  return {
    code,
    name: displayName(quote, code),
    source: registeredCodes.has(code) ? "registered" : "web",
    isRegistered: registeredCodes.has(code),
    sector: catalogSectorMap.get(code) ?? quote.sector ?? quote.industry ?? null,
    oneLiner: buildOneLiner(quote),
    summary: "",
  };
}

/**
 * Searches Yahoo Finance for stocks matching the given query.
 * Returns an array of StockSearchResult or an empty array on failure.
 *
 * This function never throws — errors are caught and logged.
 */
export async function searchYahooFinance(
  query: string,
  registeredCodes: Set<string>,
  limit: number = MAX_RESULTS,
): Promise<StockSearchResult[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const params = new URLSearchParams({
      q: query,
      lang: "ja",
      quotesCount: String(Math.min(limit * 2, 20)), // fetch extra to filter
      newsCount: "0",
      listsCount: "0",
      enableFuzzyQuery: "true",
      quotesQueryId: "tss_match_phrase_query",
    });

    const response = await fetch(`${YAHOO_SEARCH_ENDPOINT}?${params}`, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`[yahoo-search] HTTP ${response.status}`);
      return [];
    }

    const data: YahooSearchResponse = await response.json();
    const quotes = data.quotes ?? [];

    return quotes
      .map((q) => toSearchResult(q, registeredCodes))
      .filter((r): r is StockSearchResult => r !== null)
      .slice(0, limit);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.warn("[yahoo-search] Request timed out");
    } else {
      console.warn("[yahoo-search] Search failed:", error);
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

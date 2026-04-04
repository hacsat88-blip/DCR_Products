import { withRetry } from "@/lib/retry";

import { Quote, QuoteProvider } from "./types";

const YAHOO_CHART_ENDPOINT = "https://query1.finance.yahoo.com/v8/finance/chart";
const STOOQ_QUOTE_ENDPOINT = "https://stooq.com/q/l/";
const FETCH_TIMEOUT_MS = 10_000;
const CACHE_MIN_SECONDS = 15 * 60;
const CACHE_MAX_SECONDS = 60 * 60;

// TODO: Extend this table when adding new JP stock codes.
const YAHOO_SYMBOL_OVERRIDES: Record<string, string[]> = {
  "9424": ["9424.T", "9424:TYO", "9424"],
  "2337": ["2337.T", "2337:TYO", "2337"],
  "4477": ["4477.T", "4477:TYO", "4477"],
  "4419": ["4419.T", "4419:TYO", "4419"]
};

type FailureKind = "rate_limit_exceeded" | "symbol_not_found" | "empty_daily_series" | "api_error";
type FetchResult =
  | { ok: true; quote: Omit<Quote, "code"> }
  | { ok: false; kind: FailureKind; message: string };

type CacheEntry = {
  expiresAt: number;
  quote: Omit<Quote, "code">;
};

const symbolCache = new Map<string, string>();
const quoteCache = new Map<string, CacheEntry>();

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampTtlSeconds(raw: unknown): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 1800;
  }
  return Math.min(CACHE_MAX_SECONDS, Math.max(CACHE_MIN_SECONDS, Math.floor(parsed)));
}

function parseCacheTtlSeconds(): number {
  return clampTtlSeconds(process.env.YAHOO_PRICE_CACHE_TTL_SECONDS ?? "1800");
}

function cleanupExpiredCache(nowMs: number): void {
  for (const [key, entry] of quoteCache.entries()) {
    if (entry.expiresAt <= nowMs) {
      quoteCache.delete(key);
    }
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function resolveYahooSymbolCandidates(code: string): string[] {
  const defaults = [`${code}.T`, `${code}:TYO`, `${code}`];
  const table = YAHOO_SYMBOL_OVERRIDES[code] ?? [];
  const cached = symbolCache.get(code);
  return unique([cached ?? "", ...table, ...defaults]);
}

function toIsoFromUnix(value: unknown): string | null {
  const n = toNumber(value);
  if (n === null) {
    return null;
  }
  const ms = n > 1_000_000_000_000 ? n : n * 1000;
  const parsed = new Date(ms);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function pickLatestClosePair(series: unknown): { current: number | null; previous: number | null } {
  if (!Array.isArray(series)) {
    return { current: null, previous: null };
  }
  const valid = series.map((item) => toNumber(item)).filter((item): item is number => item !== null);
  if (valid.length === 0) {
    return { current: null, previous: null };
  }
  if (valid.length === 1) {
    return { current: valid[0], previous: null };
  }
  return {
    current: valid[valid.length - 1],
    previous: valid[valid.length - 2]
  };
}

async function fetchYahooDaily(symbol: string): Promise<FetchResult> {
  const url = new URL(`${YAHOO_CHART_ENDPOINT}/${encodeURIComponent(symbol)}`);
  url.searchParams.set("interval", "1d");
  url.searchParams.set("range", "5d");

  const doFetch = async (): Promise<FetchResult> => {
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
      });
    } catch (error) {
      return {
        ok: false,
        kind: "api_error",
        message: error instanceof Error ? error.message : "network error"
      };
    }

    if (response.status === 429) {
      return { ok: false, kind: "rate_limit_exceeded", message: "rate limit exceeded" };
    }
    if (!response.ok) {
      return { ok: false, kind: "api_error", message: `HTTP ${response.status}` };
    }

    const rawText = await response.text();
    let payload: {
      chart?: {
        result?: Array<{
          meta?: Record<string, unknown>;
          timestamp?: unknown[];
          indicators?: {
            quote?: Array<{
              close?: unknown[];
            }>;
          };
        }>;
        error?: { description?: string | null } | null;
      };
    };

    try {
      payload = JSON.parse(rawText) as typeof payload;
    } catch {
      const isHtml = rawText.trimStart().startsWith("<") || rawText.toLowerCase().includes("<!doctype");
      return {
        ok: false,
        kind: "api_error",
        message: isHtml ? "Yahoo returned HTML instead of JSON" : "JSON parse error"
      };
    }

    const chartError = payload.chart?.error?.description;
    if (typeof chartError === "string" && chartError.trim()) {
      const lower = chartError.toLowerCase();
      if (lower.includes("rate limit") || lower.includes("too many")) {
        return { ok: false, kind: "rate_limit_exceeded", message: "rate limit exceeded" };
      }
      return { ok: false, kind: "symbol_not_found", message: "symbol mapping failed" };
    }

    const result = payload.chart?.result?.[0];
    if (!result) {
      return { ok: false, kind: "symbol_not_found", message: "symbol mapping failed" };
    }

    const meta = result.meta ?? {};
    const closeSeries = result.indicators?.quote?.[0]?.close;
    const closes = pickLatestClosePair(closeSeries);
    const current = closes.current ?? toNumber(meta.regularMarketPrice);
    const previous = closes.previous ?? toNumber(meta.previousClose);
    const changePercent = current !== null && previous !== null && previous !== 0 ? ((current - previous) / previous) * 100 : null;

    if (current === null || changePercent === null) {
      return { ok: false, kind: "empty_daily_series", message: "empty daily series" };
    }

    const name =
      (typeof meta.shortName === "string" ? meta.shortName : null) ??
      (typeof meta.longName === "string" ? meta.longName : null) ??
      (typeof meta.symbol === "string" ? meta.symbol : null) ??
      symbol;

    const sourceTimestamp =
      toIsoFromUnix(meta.regularMarketTime) ??
      toIsoFromUnix(Array.isArray(result.timestamp) && result.timestamp.length > 0 ? result.timestamp[result.timestamp.length - 1] : null);

    return {
      ok: true,
      quote: {
        name,
        price: current,
        changePercent,
        sourceTimestamp,
        sector: null,
        marketCap: null,
        per: null,
        pbr: null,
        dividendYield: null
      }
    };
  };

  return withRetry(doFetch, {
    maxAttempts: 3,
    baseDelayMs: 1000,
    retryOn: (error) => {
      if (!(error instanceof Error)) return false;
      const msg = error.message.toLowerCase();
      return msg.includes("network") || msg.includes("timeout") || msg.includes("abort");
    }
  });
}

function parseStooqTimestamp(dateText: string, timeText: string): string | null {
  if (!/^\d{8}$/.test(dateText) || !/^\d{6}$/.test(timeText)) {
    return null;
  }
  const y = dateText.slice(0, 4);
  const m = dateText.slice(4, 6);
  const d = dateText.slice(6, 8);
  const hh = timeText.slice(0, 2);
  const mm = timeText.slice(2, 4);
  const ss = timeText.slice(4, 6);
  const parsed = new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}+09:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

async function fetchStooqDaily(code: string): Promise<FetchResult> {
  const symbol = `${code}.jp`;
  const url = new URL(STOOQ_QUOTE_ENDPOINT);
  url.searchParams.set("s", symbol);
  url.searchParams.set("i", "d");

  let response: Response;
  try {
    response = await fetch(url.toString(), { cache: "no-store", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (error) {
    return {
      ok: false,
      kind: "api_error",
      message: error instanceof Error ? error.message : "network error"
    };
  }

  if (response.status === 429) {
    return { ok: false, kind: "rate_limit_exceeded", message: "rate limit exceeded" };
  }
  if (!response.ok) {
    return { ok: false, kind: "api_error", message: `HTTP ${response.status}` };
  }

  const raw = (await response.text()).trim();
  if (!raw) {
    return { ok: false, kind: "symbol_not_found", message: "symbol mapping failed" };
  }
  if (raw.toUpperCase().includes("N/D")) {
    return { ok: false, kind: "symbol_not_found", message: "symbol mapping failed" };
  }

  const fields = raw.split(",");
  if (fields.length < 7) {
    return { ok: false, kind: "empty_daily_series", message: "empty daily series" };
  }

  const name = fields[0]?.trim() || symbol;
  const dateText = fields[1]?.trim() || "";
  const timeText = fields[2]?.trim() || "";
  const open = toNumber(fields[3]);
  const close = toNumber(fields[6]);
  const changePercent = close !== null && open !== null && open !== 0 ? ((close - open) / open) * 100 : null;

  if (close === null || changePercent === null) {
    return { ok: false, kind: "empty_daily_series", message: "empty daily series" };
  }

  return {
    ok: true,
    quote: {
      name,
      price: close,
      changePercent,
      sourceTimestamp: parseStooqTimestamp(dateText, timeText),
      sector: null,
      marketCap: null,
      per: null,
      pbr: null,
      dividendYield: null
    }
  };
}

function reasonFromObserved(observed: Record<FailureKind, boolean>): string {
  if (observed.rate_limit_exceeded) return "rate limit exceeded";
  if (observed.empty_daily_series) return "empty daily series";
  if (observed.symbol_not_found) return "symbol mapping failed";
  return "upstream request failed";
}

export class YahooFinancePriceProvider implements QuoteProvider {
  async getQuotes(codes: string[]): Promise<Quote[]> {
    const ttlSeconds = parseCacheTtlSeconds();
    const nowMs = Date.now();
    cleanupExpiredCache(nowMs);

    const results = await Promise.all(
      codes.map(async (code) => {
        const observed: Record<FailureKind, boolean> = {
          rate_limit_exceeded: false,
          symbol_not_found: false,
          empty_daily_series: false,
          api_error: false
        };

        const candidates = resolveYahooSymbolCandidates(code);
        for (const symbol of candidates) {
          const cached = quoteCache.get(symbol);
          if (cached && cached.expiresAt > nowMs) {
            symbolCache.set(code, symbol);
            return { ok: true as const, quote: { ...cached.quote, code } };
          }

          const result = await fetchYahooDaily(symbol);
          if (result.ok) {
            quoteCache.set(symbol, {
              expiresAt: Date.now() + ttlSeconds * 1000,
              quote: result.quote
            });
            symbolCache.set(code, symbol);
            return { ok: true as const, quote: { ...result.quote, code } };
          }
          observed[result.kind] = true;
        }

        const stooqKey = `${code}.jp`;
        const cached = quoteCache.get(stooqKey);
        if (cached && cached.expiresAt > nowMs) {
          return { ok: true as const, quote: { ...cached.quote, code } };
        }

        const stooq = await fetchStooqDaily(code);
        if (stooq.ok) {
          quoteCache.set(stooqKey, {
            expiresAt: Date.now() + ttlSeconds * 1000,
            quote: stooq.quote
          });
          return { ok: true as const, quote: { ...stooq.quote, code } };
        }

        observed[stooq.kind] = true;
        return { ok: false as const, error: `${code}: ${reasonFromObserved(observed)}` };
      })
    );

    const quotes = results
      .filter((result): result is { ok: true; quote: Quote } => result.ok)
      .map((result) => result.quote);
    const errors = results
      .filter((result): result is { ok: false; error: string } => !result.ok)
      .map((result) => result.error);

    if (quotes.length === 0) {
      throw new Error(`Yahoo/Stooq quotes failed for all symbols. ${errors.join(" | ")}`.trim());
    }
    return quotes;
  }
}

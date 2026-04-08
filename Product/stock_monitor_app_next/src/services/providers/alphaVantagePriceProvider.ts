import { withRetry } from "@/lib/retry";

import { Quote, QuoteProvider } from "./types";

const ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query";
const FETCH_TIMEOUT_MS = 10_000;
const CACHE_MIN_SECONDS = 15 * 60;
const CACHE_MAX_SECONDS = 60 * 60;

type FailureKind =
  | "credentials_missing"
  | "unauthorized"
  | "rate_limit_exceeded"
  | "symbol_mapping_failed"
  | "empty_daily_series"
  | "request_failed";

type FetchResult =
  | { ok: true; quote: Omit<Quote, "code"> }
  | { ok: false; kind: FailureKind; message: string };

type CacheEntry = {
  expiresAt: number;
  quote: Omit<Quote, "code">;
};

const ALPHA_SYMBOL_OVERRIDES: Record<string, string[]> = {
  "9424": ["9424.TYO", "9424.T", "9424"],
  "2337": ["2337.TYO", "2337.T", "2337"],
  "4477": ["4477.TYO", "4477.T", "4477"],
  "4419": ["4419.TYO", "4419.T", "4419"]
};

const quoteCache = new Map<string, CacheEntry>();
const symbolCache = new Map<string, string>();
let moduleAlphaVantageCallCount = 0;
const ALPHA_VANTAGE_API_KEY_ENV = "ALPHA_VANTAGE_API_KEY";
const MISSING_API_KEY_MESSAGE = `Alpha Vantage API key missing. Set ${ALPHA_VANTAGE_API_KEY_ENV} in server env and restart the dev server.`;

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function resolveAlphaSymbolCandidates(code: string): string[] {
  const defaults = [`${code}.TYO`, `${code}.T`, code];
  const table = ALPHA_SYMBOL_OVERRIDES[code] ?? [];
  const cached = symbolCache.get(code);
  return unique([cached ?? "", ...table, ...defaults]);
}

function clampTtlSeconds(raw: unknown): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 1800;
  }
  return Math.min(CACHE_MAX_SECONDS, Math.max(CACHE_MIN_SECONDS, Math.floor(parsed)));
}

function parseCacheTtlSeconds(): number {
  return clampTtlSeconds(process.env.ALPHA_VANTAGE_PRICE_CACHE_TTL_SECONDS ?? "1800");
}

function cleanupExpiredCache(nowMs: number): void {
  for (const [key, entry] of quoteCache.entries()) {
    if (entry.expiresAt <= nowMs) {
      quoteCache.delete(key);
    }
  }
}

function classifyFailure(message: string): FailureKind {
  const lower = message.toLowerCase();
  if (lower.includes("api key missing") || lower.includes("credentials missing")) {
    return "credentials_missing";
  }
  if (lower.includes("invalid api key") || lower.includes("unauthorized") || lower.includes("forbidden")) {
    return "unauthorized";
  }
  if (lower.includes("rate limit") || lower.includes("call frequency") || lower.includes("too many")) {
    return "rate_limit_exceeded";
  }
  if (lower.includes("symbol mapping failed") || lower.includes("invalid api call")) {
    return "symbol_mapping_failed";
  }
  if (lower.includes("empty daily series")) {
    return "empty_daily_series";
  }
  return "request_failed";
}

function reasonFromObserved(observed: Record<FailureKind, boolean>): string {
  if (observed.credentials_missing) {
    return "Alpha Vantage API key missing";
  }
  if (observed.unauthorized) {
    return "Alpha Vantage unauthorized";
  }
  if (observed.rate_limit_exceeded) {
    return "rate limit exceeded";
  }
  if (observed.empty_daily_series) {
    return "empty daily series";
  }
  if (observed.symbol_mapping_failed) {
    return "symbol mapping failed";
  }
  return "Alpha Vantage request failed";
}

function toIsoFromDateKey(raw: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return null;
  }
  const parsed = new Date(`${raw}T15:00:00+09:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseDailySeries(payload: unknown): Array<{ date: string; close: number }> {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const map = payload as Record<string, unknown>;
  const series = map["Time Series (Daily)"];
  if (!series || typeof series !== "object") {
    return [];
  }

  const rows: Array<{ date: string; close: number }> = [];
  for (const [date, values] of Object.entries(series as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !values || typeof values !== "object") {
      continue;
    }
    const valueMap = values as Record<string, unknown>;
    const close = toNumber(valueMap["5. adjusted close"] ?? valueMap["4. close"]);
    if (close !== null) {
      rows.push({ date, close });
    }
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows;
}

export class AlphaVantagePriceProvider implements QuoteProvider {
  constructor(private readonly apiKey: string | null = process.env.ALPHA_VANTAGE_API_KEY ?? null) {}

  getCumulativeCallCount(): number {
    return moduleAlphaVantageCallCount;
  }

  private getApiKey(): string {
    const key = this.apiKey?.trim();
    if (!key) {
      throw new Error(MISSING_API_KEY_MESSAGE);
    }
    return key;
  }

  private async fetchDailyQuote(symbol: string): Promise<FetchResult> {
    const apiKey = this.getApiKey();
    const url = new URL(ALPHA_VANTAGE_BASE_URL);
    url.searchParams.set("function", "TIME_SERIES_DAILY_ADJUSTED");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("outputsize", "compact");
    url.searchParams.set("apikey", apiKey);

    const doFetch = async (): Promise<FetchResult> => {
      let response: Response;
      try {
        moduleAlphaVantageCallCount += 1;
        response = await fetch(url.toString(), {
          method: "GET",
          cache: "no-store",
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "network error";
        return { ok: false, kind: classifyFailure(message), message };
      }

      const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      const errorMessage = typeof payload?.["Error Message"] === "string" ? payload["Error Message"] : null;
      const rateLimitNote = typeof payload?.Note === "string" ? payload.Note : null;
      const info = typeof payload?.Information === "string" ? payload.Information : null;

      if (response.status === 429 || (rateLimitNote && rateLimitNote.toLowerCase().includes("call frequency"))) {
        return { ok: false, kind: "rate_limit_exceeded", message: "rate limit exceeded" };
      }
      if (!response.ok) {
        const message = errorMessage ?? rateLimitNote ?? info ?? `HTTP ${response.status}`;
        return { ok: false, kind: classifyFailure(String(message)), message: String(message) };
      }
      if (errorMessage) {
        return { ok: false, kind: "symbol_mapping_failed", message: "symbol mapping failed" };
      }
      if (rateLimitNote) {
        return { ok: false, kind: "rate_limit_exceeded", message: "rate limit exceeded" };
      }

      const rows = parseDailySeries(payload);
      if (rows.length < 2) {
        return { ok: false, kind: "empty_daily_series", message: "empty daily series" };
      }

      const current = rows[rows.length - 1];
      const previous = rows[rows.length - 2];
      if (!previous || previous.close === 0) {
        return { ok: false, kind: "empty_daily_series", message: "empty daily series" };
      }

      const changePercent = ((current.close - previous.close) / previous.close) * 100;
      if (!Number.isFinite(changePercent)) {
        return { ok: false, kind: "empty_daily_series", message: "empty daily series" };
      }

      const meta = payload?.["Meta Data"];
      const metaSymbol =
        meta && typeof meta === "object" && typeof (meta as Record<string, unknown>)["2. Symbol"] === "string"
          ? String((meta as Record<string, unknown>)["2. Symbol"])
          : symbol;

      return {
        ok: true,
        quote: {
          name: metaSymbol,
          price: current.close,
          changePercent,
          sourceTimestamp: toIsoFromDateKey(current.date),
          sourceLabel: "AV",
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
        return msg.includes("timeout") || msg.includes("abort") || msg.includes("network");
      }
    });
  }

  async getQuotes(codes: string[]): Promise<Quote[]> {
    const ttlSeconds = parseCacheTtlSeconds();
    const nowMs = Date.now();
    cleanupExpiredCache(nowMs);

    const results = await Promise.all(
      codes.map(async (code) => {
        const cached = quoteCache.get(code);
        if (cached && cached.expiresAt > nowMs) {
          return { ok: true as const, quote: { ...cached.quote, code } };
        }

        const observed: Record<FailureKind, boolean> = {
          credentials_missing: false,
          unauthorized: false,
          rate_limit_exceeded: false,
          symbol_mapping_failed: false,
          empty_daily_series: false,
          request_failed: false
        };

        const candidates = resolveAlphaSymbolCandidates(code);
        for (const candidate of candidates) {
          let result: FetchResult;
          try {
            result = await this.fetchDailyQuote(candidate);
          } catch (error) {
            const message = error instanceof Error ? error.message : "Alpha Vantage request failed";
            const kind = classifyFailure(message);
            observed[kind] = true;
            continue;
          }

          if (!result.ok) {
            observed[result.kind] = true;
            continue;
          }

          symbolCache.set(code, candidate);
          quoteCache.set(code, {
            expiresAt: Date.now() + ttlSeconds * 1000,
            quote: result.quote
          });
          return { ok: true as const, quote: { ...result.quote, code } };
        }

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
      throw new Error(`Alpha Vantage quotes failed for all symbols. ${errors.join(" | ")}`.trim());
    }

    return quotes;
  }
}

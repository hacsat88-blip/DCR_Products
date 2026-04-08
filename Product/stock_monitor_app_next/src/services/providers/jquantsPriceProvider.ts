import { withRetry } from "@/lib/retry";

import { Quote, QuoteProvider } from "./types";

const JQUANTS_BASE_URL = "https://api.jquants.com/v2";
const FETCH_TIMEOUT_MS = 10_000;
const DAILY_BARS_ENDPOINT = `${JQUANTS_BASE_URL}/equities/bars/daily`;

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

// TODO: Extend this table when adding JP stock codes.
const JQUANTS_CODE_OVERRIDES: Record<string, string[]> = {
  "9424": ["9424", "94240"],
  "2337": ["2337", "23370"],
  "4477": ["4477", "44770"],
  "4419": ["4419", "44190"]
};

const quoteCache = new Map<string, CacheEntry>();
const JQUANTS_API_KEY_ENV = "JQUANTS_API_KEY";
const MISSING_API_KEY_MESSAGE = `J-Quants API key missing. Set ${JQUANTS_API_KEY_ENV} in .env.local and restart the dev server.`;
const LEGACY_KEY_HINT =
  "JQUANTS_REFRESH_TOKEN is not used for J-Quants V2 price auth. Use JQUANTS_API_KEY.";
const UNAUTHORIZED_MESSAGE =
  "J-Quants unauthorized. Verify JQUANTS_API_KEY is a J-Quants V2 API key (not a refresh token or legacy token).";

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const message = (payload as Record<string, unknown>).message;
  return typeof message === "string" && message.trim() ? message.trim() : null;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function resolveCodeCandidates(code: string): string[] {
  const defaults = [code, `${code}0`];
  const table = JQUANTS_CODE_OVERRIDES[code] ?? [];
  return unique([...table, ...defaults]);
}

function clampTtlSeconds(raw: unknown): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 1800;
  }
  return Math.min(CACHE_MAX_SECONDS, Math.max(CACHE_MIN_SECONDS, Math.floor(parsed)));
}

function parseCacheTtlSeconds(): number {
  return clampTtlSeconds(process.env.JQUANTS_PRICE_CACHE_TTL_SECONDS ?? "1800");
}

function cleanupExpiredCache(nowMs: number): void {
  for (const [key, entry] of quoteCache.entries()) {
    if (entry.expiresAt <= nowMs) {
      quoteCache.delete(key);
    }
  }
}

function classifyErrorMessage(raw: string): FailureKind {
  const message = raw.toLowerCase();
  if (message.includes("credentials missing")) {
    return "credentials_missing";
  }
  if (
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("invalid api key")
  ) {
    return "unauthorized";
  }
  if (message.includes("rate limit") || message.includes("too many requests")) {
    return "rate_limit_exceeded";
  }
  if (message.includes("api key missing") || message.includes("credentials")) {
    return "credentials_missing";
  }
  if (message.includes("symbol mapping failed")) {
    return "symbol_mapping_failed";
  }
  if (message.includes("empty daily series")) {
    return "empty_daily_series";
  }
  return "request_failed";
}

function reasonFromObserved(observed: Record<FailureKind, boolean>): string {
  if (observed.credentials_missing) {
    return "J-Quants API key missing (set JQUANTS_API_KEY in .env.local)";
  }
  if (observed.unauthorized) {
    return "J-Quants unauthorized (verify JQUANTS_API_KEY is V2 API key, not refresh token/legacy token)";
  }
  if (observed.rate_limit_exceeded) return "rate limit exceeded";
  if (observed.empty_daily_series) return "empty daily series";
  if (observed.symbol_mapping_failed) return "symbol mapping failed";
  return "J-Quants request failed";
}

function ymd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateKey(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }
  const value = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return null;
}

function toIsoFromDateKey(raw: unknown): string | null {
  const dateKey = normalizeDateKey(raw);
  if (!dateKey) {
    return null;
  }
  const parsed = new Date(`${dateKey}T15:00:00+09:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseDailyRows(payload: unknown): Array<Record<string, unknown>> {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const map = payload as Record<string, unknown>;
  if (Array.isArray(map.data)) {
    return map.data.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null);
  }
  // Backward compatibility for old payload shape.
  if (Array.isArray(map.daily_quotes)) {
    return map.daily_quotes.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null);
  }
  return [];
}

function getConfiguredApiKey(): string | null {
  const key = process.env.JQUANTS_API_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

export class JQuantsPriceProvider implements QuoteProvider {
  private async fetchWithApiKey(url: URL): Promise<unknown> {
    const apiKey = getConfiguredApiKey();
    if (!apiKey) {
      const hasLegacyVar = Boolean(process.env.JQUANTS_REFRESH_TOKEN?.trim());
      if (hasLegacyVar) {
        throw new Error(`${MISSING_API_KEY_MESSAGE} ${LEGACY_KEY_HINT}`);
      }
      throw new Error(MISSING_API_KEY_MESSAGE);
    }

    const doFetch = async (): Promise<unknown> => {
      const response = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          "x-api-key": apiKey
        }
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (response.status === 429) {
        throw new Error("J-Quants rate limit exceeded");
      }
      if (!response.ok) {
        const message = toMessage(payload);
        if (response.status === 401 || response.status === 403) {
          throw new Error(`${UNAUTHORIZED_MESSAGE}${message ? ` (${message})` : ""}`);
        }
        throw new Error(`J-Quants request failed: ${message ?? `HTTP ${response.status}`}`);
      }
      return payload;
    };

    return withRetry(doFetch, {
      maxAttempts: 3,
      baseDelayMs: 1000,
      retryOn: (error) => {
        if (!(error instanceof Error)) return false;
        const msg = error.message.toLowerCase();
        if (msg.includes("unauthorized") || msg.includes("forbidden") || msg.includes("api key missing")) return false;
        return msg.includes("rate limit") || msg.includes("429") || msg.includes("503") || msg.includes("timeout") || msg.includes("abort") || msg.includes("network");
      }
    });
  }

  private async fetchDailyQuote(codeCandidate: string): Promise<FetchResult> {
    const url = new URL(DAILY_BARS_ENDPOINT);
    url.searchParams.set("code", codeCandidate);
    url.searchParams.set("from", ymd(new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)));
    url.searchParams.set("to", ymd(new Date()));

    let payload: unknown;
    try {
      payload = await this.fetchWithApiKey(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "upstream request failed";
      return { ok: false, kind: classifyErrorMessage(message), message };
    }

    const rows = parseDailyRows(payload);
    if (rows.length === 0) {
      return { ok: false, kind: "symbol_mapping_failed", message: "symbol mapping failed" };
    }

    const parsedRows = rows
      .map((row) => {
        const date = normalizeDateKey(row.Date);
        const close = toNumber(row.AdjC ?? row.C ?? row.AdjustmentClose ?? row.Close);
        return { date, close };
      })
      .filter((row): row is { date: string; close: number } => row.date !== null && row.close !== null)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (parsedRows.length < 2) {
      return { ok: false, kind: "empty_daily_series", message: "empty daily series" };
    }

    const current = parsedRows[parsedRows.length - 1];
    const previous = parsedRows[parsedRows.length - 2];
    if (!previous || previous.close === 0) {
      return { ok: false, kind: "empty_daily_series", message: "empty daily series" };
    }

    const changePercent = ((current.close - previous.close) / previous.close) * 100;
    if (!Number.isFinite(changePercent)) {
      return { ok: false, kind: "empty_daily_series", message: "empty daily series" };
    }

    return {
      ok: true,
      quote: {
        name: null,
        price: current.close,
        changePercent,
        sourceTimestamp: toIsoFromDateKey(current.date),
        sector: null,
        marketCap: null,
        per: null,
        pbr: null,
        dividendYield: null
      }
    };
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

        const candidates = resolveCodeCandidates(code);
        for (const candidate of candidates) {
          const result = await this.fetchDailyQuote(candidate);
          if (!result.ok) {
            observed[result.kind] = true;
            continue;
          }

          const quote: Omit<Quote, "code"> = {
            ...result.quote
          };

          quoteCache.set(code, {
            expiresAt: Date.now() + ttlSeconds * 1000,
            quote
          });

          return { ok: true as const, quote: { ...quote, code } };
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
      throw new Error(`J-Quants quotes failed for all symbols. ${errors.join(" | ")}`.trim());
    }

    return quotes;
  }
}

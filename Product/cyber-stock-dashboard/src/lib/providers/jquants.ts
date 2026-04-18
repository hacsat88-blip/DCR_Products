import { z } from "zod";
import { requireEnv } from "@/lib/env";
import { CandleSchema, type Candle, type FetchDeps } from "./types";
import { createRateLimiter } from "./rateLimit";

const BASE_URL = "https://api.jquants.com/v1";
const ID_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const LISTED_INFO_TTL_MS = 60 * 60 * 1000;

const RefreshResponseSchema = z.object({ idToken: z.string().min(1) });

const DailyQuoteSchema = z.object({
  Date: z.string(),
  Code: z.string(),
  Open: z.number().nullable().optional(),
  High: z.number().nullable().optional(),
  Low: z.number().nullable().optional(),
  Close: z.number().nullable().optional(),
  Volume: z.number().nullable().optional(),
  AdjustmentClose: z.number().nullable().optional(),
});
const DailyQuotesResponseSchema = z.object({
  daily_quotes: z.array(DailyQuoteSchema),
  pagination_key: z.string().optional(),
});

const ListedInfoItemSchema = z.object({
  Code: z.string(),
  CompanyName: z.string().optional(),
  CompanyNameEnglish: z.string().optional(),
  Sector17Code: z.string().optional(),
  Sector33Code: z.string().optional(),
  MarketCode: z.string().optional(),
  ScaleCategory: z.string().optional(),
});
export type JQuantsListedItem = z.infer<typeof ListedInfoItemSchema>;
const ListedInfoResponseSchema = z.object({
  info: z.array(ListedInfoItemSchema),
});

export interface JQuantsDailyQuoteRow {
  code: string;
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

export interface JQuantsClient {
  getIdToken(): Promise<string>;
  getDailyQuotes(code: string, from: string, to: string): Promise<Candle[]>;
  getListedInfo(): Promise<JQuantsListedItem[]>;
  /**
   * 指定日付の全銘柄日次データ。スクリーニング用。
   * date は "YYYY-MM-DD"。
   */
  getDailyQuotesByDate(date: string): Promise<JQuantsDailyQuoteRow[]>;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface CreateJQuantsClientOptions extends FetchDeps {
  refreshToken?: string;
  baseUrl?: string;
  now?: () => number;
}

export function createJQuantsClient(
  opts: CreateJQuantsClientOptions = {},
): JQuantsClient {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const baseUrl = opts.baseUrl ?? BASE_URL;
  const now = opts.now ?? Date.now;
  const limiter = createRateLimiter({ minIntervalMs: 1000 });

  let idTokenCache: CacheEntry<string> | null = null;
  let listedCache: CacheEntry<JQuantsListedItem[]> | null = null;

  const refresh = (): string =>
    opts.refreshToken ?? requireEnv("JQUANTS_REFRESH_TOKEN");

  async function getIdToken(): Promise<string> {
    if (idTokenCache && idTokenCache.expiresAt > now()) {
      return idTokenCache.value;
    }
    const token = refresh();
    const url = `${baseUrl}/token/auth_refresh?refreshtoken=${encodeURIComponent(token)}`;
    const res = await limiter.schedule(() =>
      fetchImpl(url, { method: "POST" }),
    );
    if (!res.ok) {
      throw new Error(`J-Quants auth_refresh failed: ${res.status}`);
    }
    const json = await res.json();
    const parsed = RefreshResponseSchema.parse(json);
    idTokenCache = {
      value: parsed.idToken,
      expiresAt: now() + ID_TOKEN_TTL_MS,
    };
    return parsed.idToken;
  }

  async function authedFetch(path: string): Promise<unknown> {
    const idToken = await getIdToken();
    const res = await limiter.schedule(() =>
      fetchImpl(`${baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      }),
    );
    if (!res.ok) {
      throw new Error(`J-Quants ${path} failed: ${res.status}`);
    }
    return res.json();
  }

  async function getDailyQuotes(
    code: string,
    from: string,
    to: string,
  ): Promise<Candle[]> {
    const params = new URLSearchParams({ code, from, to });
    const json = await authedFetch(`/prices/daily_quotes?${params.toString()}`);
    const parsed = DailyQuotesResponseSchema.parse(json);
    const candles: Candle[] = [];
    for (const q of parsed.daily_quotes) {
      if (
        q.Open == null ||
        q.High == null ||
        q.Low == null ||
        q.Close == null
      ) {
        continue;
      }
      candles.push(
        CandleSchema.parse({
          date: q.Date,
          open: q.Open,
          high: q.High,
          low: q.Low,
          close: q.Close,
          volume: q.Volume ?? 0,
          adjustedClose: q.AdjustmentClose ?? undefined,
        }),
      );
    }
    return candles;
  }

  async function getListedInfo(): Promise<JQuantsListedItem[]> {
    if (listedCache && listedCache.expiresAt > now()) {
      return listedCache.value;
    }
    const json = await authedFetch("/listed/info");
    const parsed = ListedInfoResponseSchema.parse(json);
    listedCache = {
      value: parsed.info,
      expiresAt: now() + LISTED_INFO_TTL_MS,
    };
    return parsed.info;
  }

  async function getDailyQuotesByDate(
    date: string,
  ): Promise<JQuantsDailyQuoteRow[]> {
    const params = new URLSearchParams({ date });
    const json = await authedFetch(`/prices/daily_quotes?${params.toString()}`);
    const parsed = DailyQuotesResponseSchema.parse(json);
    return parsed.daily_quotes.map((q) => ({
      code: q.Code,
      date: q.Date,
      open: q.Open ?? null,
      high: q.High ?? null,
      low: q.Low ?? null,
      close: q.Close ?? null,
      volume: q.Volume ?? null,
    }));
  }

  return {
    getIdToken,
    getDailyQuotes,
    getListedInfo,
    getDailyQuotesByDate,
  };
}

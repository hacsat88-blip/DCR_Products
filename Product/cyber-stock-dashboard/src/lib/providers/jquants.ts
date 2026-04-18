import { z } from "zod";
import { getServerEnv, requireEnv } from "@/lib/env";
import { CandleSchema, type Candle, type FetchDeps } from "./types";
import { createRateLimiter } from "./rateLimit";

const BASE_URL = "https://api.jquants.com";
const ID_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const LISTED_INFO_TTL_MS = 60 * 60 * 1000;

const RefreshResponseSchema = z.object({ idToken: z.string().min(1) });

const DailyQuoteSchema = z.object({
  Date: z.string().optional(),
  Code: z.string().optional(),
  O: z.number().nullable().optional(),
  H: z.number().nullable().optional(),
  L: z.number().nullable().optional(),
  C: z.number().nullable().optional(),
  Vo: z.number().nullable().optional(),
  AdjC: z.number().nullable().optional(),
  Open: z.number().nullable().optional(),
  High: z.number().nullable().optional(),
  Low: z.number().nullable().optional(),
  Close: z.number().nullable().optional(),
  Volume: z.number().nullable().optional(),
  AdjustmentClose: z.number().nullable().optional(),
});
const DailyQuotesCompatResponseSchema = z
  .object({
    data: z.array(DailyQuoteSchema).optional(),
    daily_quotes: z.array(DailyQuoteSchema).optional(),
    pagination_key: z.string().optional(),
  })
  .refine((v) => v.data != null || v.daily_quotes != null, {
    message: "J-Quants response must include data or daily_quotes",
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
const ListedInfoCompatResponseSchema = z
  .object({
    data: z.array(ListedInfoItemSchema).optional(),
    info: z.array(ListedInfoItemSchema).optional(),
  })
  .refine((v) => v.data != null || v.info != null, {
    message: "J-Quants response must include data or info",
  });

function extractDailyRows(
  parsed: z.infer<typeof DailyQuotesCompatResponseSchema>,
): Array<z.infer<typeof DailyQuoteSchema>> {
  return parsed.data ?? parsed.daily_quotes ?? [];
}

function extractListedRows(
  parsed: z.infer<typeof ListedInfoCompatResponseSchema>,
): JQuantsListedItem[] {
  return parsed.data ?? parsed.info ?? [];
}

function resolveBarPath(mode: "v2-api-key" | "v1-refresh"): string {
  return mode === "v2-api-key"
    ? "/v2/equities/bars/daily"
    : "/v1/prices/daily_quotes";
}

function resolveMasterPath(mode: "v2-api-key" | "v1-refresh"): string {
  return mode === "v2-api-key" ? "/v2/equities/master" : "/v1/listed/info";
}

function prependBase(baseUrl: string, path: string): string {
  if (baseUrl.endsWith("/v1") && path.startsWith("/v1/")) {
    return `${baseUrl}${path.slice(3)}`;
  }
  if (baseUrl.endsWith("/v2") && path.startsWith("/v2/")) {
    return `${baseUrl}${path.slice(3)}`;
  }
  return `${baseUrl}${path}`;
}

function pickPriceField(
  v2Value: number | null | undefined,
  v1Value: number | null | undefined,
): number | null {
  return v2Value ?? v1Value ?? null;
}

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
  apiKey?: string;
  refreshToken?: string;
  baseUrl?: string;
  now?: () => number;
}

export function createJQuantsClient(
  opts: CreateJQuantsClientOptions = {},
): JQuantsClient {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const baseUrl = (opts.baseUrl ?? BASE_URL).replace(/\/+$/, "");
  const now = opts.now ?? Date.now;
  const limiter = createRateLimiter({ minIntervalMs: 1000 });
  const env = getServerEnv();
  const apiKey = opts.apiKey ?? env.JQUANTS_API_KEY;
  const authMode: "v2-api-key" | "v1-refresh" = apiKey
    ? "v2-api-key"
    : "v1-refresh";

  let idTokenCache: CacheEntry<string> | null = null;
  let listedCache: CacheEntry<JQuantsListedItem[]> | null = null;

  const refresh = (): string =>
    opts.refreshToken ?? requireEnv("JQUANTS_REFRESH_TOKEN");

  async function getIdToken(): Promise<string> {
    if (authMode === "v2-api-key") {
      return apiKey as string;
    }
    if (idTokenCache && idTokenCache.expiresAt > now()) {
      return idTokenCache.value;
    }
    const token = refresh();
    const url = prependBase(
      baseUrl,
      `/v1/token/auth_refresh?refreshtoken=${encodeURIComponent(token)}`,
    );
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
    const headers: Record<string, string> = {};
    if (authMode === "v2-api-key") {
      headers["x-api-key"] = apiKey as string;
    } else {
      const idToken = await getIdToken();
      headers.Authorization = `Bearer ${idToken}`;
    }
    const res = await limiter.schedule(() =>
      fetchImpl(prependBase(baseUrl, path), {
        headers,
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
    const json = await authedFetch(
      `${resolveBarPath(authMode)}?${params.toString()}`,
    );
    const parsed = DailyQuotesCompatResponseSchema.parse(json);
    const rows = extractDailyRows(parsed);
    const candles: Candle[] = [];
    for (const q of rows) {
      const date = q.Date;
      const open = pickPriceField(q.O, q.Open);
      const high = pickPriceField(q.H, q.High);
      const low = pickPriceField(q.L, q.Low);
      const close = pickPriceField(q.C, q.Close);
      if (
        !date ||
        open == null ||
        high == null ||
        low == null ||
        close == null
      ) {
        continue;
      }
      candles.push(
        CandleSchema.parse({
          date,
          open,
          high,
          low,
          close,
          volume: pickPriceField(q.Vo, q.Volume) ?? 0,
          adjustedClose: q.AdjC ?? q.AdjustmentClose ?? undefined,
        }),
      );
    }
    return candles;
  }

  async function getListedInfo(): Promise<JQuantsListedItem[]> {
    if (listedCache && listedCache.expiresAt > now()) {
      return listedCache.value;
    }
    const json = await authedFetch(resolveMasterPath(authMode));
    const parsed = ListedInfoCompatResponseSchema.parse(json);
    const listed = extractListedRows(parsed);
    listedCache = {
      value: listed,
      expiresAt: now() + LISTED_INFO_TTL_MS,
    };
    return listed;
  }

  async function getDailyQuotesByDate(
    date: string,
  ): Promise<JQuantsDailyQuoteRow[]> {
    const params = new URLSearchParams({ date });
    const json = await authedFetch(
      `${resolveBarPath(authMode)}?${params.toString()}`,
    );
    const parsed = DailyQuotesCompatResponseSchema.parse(json);
    const rows = extractDailyRows(parsed);
    return rows.flatMap((q) => {
      if (!q.Code || !q.Date) return [];
      return [
        {
          code: q.Code,
          date: q.Date,
          open: pickPriceField(q.O, q.Open),
          high: pickPriceField(q.H, q.High),
          low: pickPriceField(q.L, q.Low),
          close: pickPriceField(q.C, q.Close),
          volume: pickPriceField(q.Vo, q.Volume),
        },
      ];
    });
  }

  return {
    getIdToken,
    getDailyQuotes,
    getListedInfo,
    getDailyQuotesByDate,
  };
}

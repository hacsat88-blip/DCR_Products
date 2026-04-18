import { z } from "zod";
import { CandleSchema, type Candle, type FetchDeps } from "./types";

const BASE_URL = "https://query1.finance.yahoo.com/v8/finance";

const YahooChartResponseSchema = z.object({
  chart: z.object({
    result: z
      .array(
        z.object({
          timestamp: z.array(z.number()).optional(),
          indicators: z
            .object({
              quote: z
                .array(
                  z.object({
                    open: z.array(z.number().nullable()).optional(),
                    high: z.array(z.number().nullable()).optional(),
                    low: z.array(z.number().nullable()).optional(),
                    close: z.array(z.number().nullable()).optional(),
                    volume: z.array(z.number().nullable()).optional(),
                  }),
                )
                .optional(),
              adjclose: z
                .array(
                  z.object({
                    adjclose: z.array(z.number().nullable()).optional(),
                  }),
                )
                .optional(),
            })
            .optional(),
        }),
      )
      .nullable()
      .optional(),
    error: z
      .object({
        code: z.string().optional(),
        description: z.string().optional(),
      })
      .nullable()
      .optional(),
  }),
});

export type YahooMarket = "jp" | "us";

export interface YahooDailyOptions {
  market?: YahooMarket;
  days?: number;
}

export interface YahooFinanceClient {
  getDailyCandles(symbol: string, opts?: YahooDailyOptions): Promise<Candle[]>;
}

export interface CreateYahooFinanceClientOptions extends FetchDeps {
  baseUrl?: string;
  now?: () => number;
}

export function normalizeYahooSymbol(
  symbol: string,
  market: YahooMarket = "us",
): string {
  const s = symbol.trim();
  if (market !== "jp") return s;
  if (/^\d{4}\.T$/i.test(s)) return s.toUpperCase();
  if (/^\d{4}$/.test(s)) return `${s}.T`;
  return s;
}

export function createYahooFinanceClient(
  opts: CreateYahooFinanceClientOptions = {},
): YahooFinanceClient {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const baseUrl = opts.baseUrl ?? BASE_URL;
  const now = opts.now ?? Date.now;

  async function getDailyCandles(
    symbol: string,
    dailyOpts: YahooDailyOptions = {},
  ): Promise<Candle[]> {
    const market = dailyOpts.market ?? "us";
    const normalized = normalizeYahooSymbol(symbol, market);
    const days = Math.max(7, Math.min(dailyOpts.days ?? 365, 3650));
    const period2 = Math.floor(now() / 1000);
    const period1 = Math.max(0, period2 - days * 24 * 60 * 60);
    const query = new URLSearchParams({
      interval: "1d",
      period1: String(period1),
      period2: String(period2),
      events: "history",
      includeAdjustedClose: "true",
    });
    const url = `${baseUrl}/chart/${encodeURIComponent(normalized)}?${query.toString()}`;
    const res = await fetchImpl(url);
    if (!res.ok) {
      throw new Error(
        `Yahoo Finance chart request failed for ${normalized}: ${res.status}`,
      );
    }

    const json = await res.json();
    const parsed = YahooChartResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(`Yahoo Finance malformed chart payload for ${normalized}`);
    }
    const chart = parsed.data.chart;
    if (chart.error) {
      const reason = chart.error.description ?? chart.error.code ?? "unknown";
      throw new Error(`Yahoo Finance error for ${normalized}: ${reason}`);
    }

    const result = chart.result?.[0];
    if (!result) {
      throw new Error(`Yahoo Finance missing chart result for ${normalized}`);
    }

    const timestamps = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0];
    if (!quote || timestamps.length === 0) {
      throw new Error(`Yahoo Finance missing candle arrays for ${normalized}`);
    }

    const opens = quote.open ?? [];
    const highs = quote.high ?? [];
    const lows = quote.low ?? [];
    const closes = quote.close ?? [];
    const volumes = quote.volume ?? [];
    const adjusted =
      result.indicators?.adjclose?.[0]?.adjclose ??
      new Array<number | null>(timestamps.length).fill(null);

    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i += 1) {
      const open = opens[i];
      const high = highs[i];
      const low = lows[i];
      const close = closes[i];
      const ts = timestamps[i];
      if (
        open == null ||
        high == null ||
        low == null ||
        close == null ||
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close)
      ) {
        continue;
      }
      candles.push(
        CandleSchema.parse({
          date: new Date(ts * 1000).toISOString().slice(0, 10),
          open,
          high,
          low,
          close,
          volume:
            volumes[i] != null && Number.isFinite(volumes[i] as number)
              ? (volumes[i] as number)
              : 0,
          adjustedClose: adjusted[i] ?? undefined,
        }),
      );
    }

    if (candles.length === 0) {
      throw new Error(`Yahoo Finance returned no valid candles for ${normalized}`);
    }

    candles.sort((a, b) => (a.date < b.date ? -1 : 1));
    return candles;
  }

  return { getDailyCandles };
}

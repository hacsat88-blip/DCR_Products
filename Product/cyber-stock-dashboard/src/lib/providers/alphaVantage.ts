import { z } from "zod";
import { requireEnv } from "@/lib/env";
import {
  CandleSchema,
  QuoteSchema,
  type Candle,
  type Currency,
  type FetchDeps,
  type Quote,
} from "./types";
import { createRateLimiter } from "./rateLimit";

const BASE_URL = "https://www.alphavantage.co/query";

const numericString = z
  .string()
  .refine((s) => s.trim() !== "" && !Number.isNaN(Number(s)), {
    message: "expected numeric string",
  })
  .transform((s) => Number(s));

const DailyAdjustedRowSchema = z.object({
  "1. open": numericString,
  "2. high": numericString,
  "3. low": numericString,
  "4. close": numericString,
  "5. adjusted close": numericString.optional(),
  "6. volume": numericString,
});

const DailyAdjustedResponseSchema = z.object({
  "Time Series (Daily)": z.record(z.string(), DailyAdjustedRowSchema),
});

const GlobalQuoteResponseSchema = z.object({
  "Global Quote": z.object({
    "01. symbol": z.string(),
    "05. price": numericString,
    "07. latest trading day": z.string(),
    "09. change": numericString.optional(),
    "10. change percent": z.string().optional(),
  }),
});

const FxResponseSchema = z.object({
  "Realtime Currency Exchange Rate": z.object({
    "1. From_Currency Code": z.string(),
    "3. To_Currency Code": z.string(),
    "5. Exchange Rate": numericString,
  }),
});

export interface AlphaVantageClient {
  getDailyAdjusted(symbol: string): Promise<Candle[]>;
  getQuote(symbol: string): Promise<Quote>;
  getFxRate(from: Currency | string, to: Currency | string): Promise<number>;
}

export interface CreateAlphaVantageClientOptions extends FetchDeps {
  apiKey?: string;
  baseUrl?: string;
}

export function createAlphaVantageClient(
  opts: CreateAlphaVantageClientOptions = {},
): AlphaVantageClient {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const baseUrl = opts.baseUrl ?? BASE_URL;
  const limiter = createRateLimiter({
    maxPerWindow: 5,
    windowMs: 60_000,
  });
  const apiKey = (): string =>
    opts.apiKey ?? requireEnv("ALPHA_VANTAGE_API_KEY");

  async function call(params: Record<string, string>): Promise<unknown> {
    const search = new URLSearchParams({ ...params, apikey: apiKey() });
    const url = `${baseUrl}?${search.toString()}`;
    const res = await limiter.schedule(() => fetchImpl(url));
    if (!res.ok) {
      throw new Error(`AlphaVantage ${params.function} failed: ${res.status}`);
    }
    const json = (await res.json()) as Record<string, unknown>;
    if (json && typeof json === "object" && "Note" in json) {
      throw new Error(`AlphaVantage rate limited: ${String(json.Note)}`);
    }
    if (json && typeof json === "object" && "Error Message" in json) {
      throw new Error(`AlphaVantage error: ${String(json["Error Message"])}`);
    }
    return json;
  }

  async function getDailyAdjusted(symbol: string): Promise<Candle[]> {
    const json = await call({
      function: "TIME_SERIES_DAILY_ADJUSTED",
      symbol,
      outputsize: "compact",
    });
    const parsed = DailyAdjustedResponseSchema.parse(json);
    const series = parsed["Time Series (Daily)"];
    const candles: Candle[] = Object.entries(series).map(([date, row]) =>
      CandleSchema.parse({
        date,
        open: row["1. open"],
        high: row["2. high"],
        low: row["3. low"],
        close: row["4. close"],
        volume: row["6. volume"],
        adjustedClose: row["5. adjusted close"],
      }),
    );
    candles.sort((a, b) => (a.date < b.date ? -1 : 1));
    return candles;
  }

  async function getQuote(symbol: string): Promise<Quote> {
    const json = await call({ function: "GLOBAL_QUOTE", symbol });
    const parsed = GlobalQuoteResponseSchema.parse(json);
    const q = parsed["Global Quote"];
    const pctRaw = q["10. change percent"];
    const changePercent =
      pctRaw != null ? Number(pctRaw.replace("%", "")) : undefined;
    return QuoteSchema.parse({
      symbol: q["01. symbol"],
      price: q["05. price"],
      change: q["09. change"],
      changePercent:
        changePercent != null && Number.isFinite(changePercent)
          ? changePercent
          : undefined,
      currency: "USD",
      timestamp: q["07. latest trading day"],
    });
  }

  async function getFxRate(
    from: Currency | string,
    to: Currency | string,
  ): Promise<number> {
    const json = await call({
      function: "CURRENCY_EXCHANGE_RATE",
      from_currency: String(from),
      to_currency: String(to),
    });
    const parsed = FxResponseSchema.parse(json);
    return parsed["Realtime Currency Exchange Rate"]["5. Exchange Rate"];
  }

  return { getDailyAdjusted, getQuote, getFxRate };
}

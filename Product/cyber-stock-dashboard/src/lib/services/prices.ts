import {
  createJQuantsClient,
  type JQuantsClient,
} from "@/lib/providers/jquants";
import {
  createAlphaVantageClient,
  type AlphaVantageClient,
} from "@/lib/providers/alphaVantage";
import {
  createYahooFinanceClient,
  type YahooFinanceClient,
} from "@/lib/providers/yahooFinance";
import type { Candle } from "@/lib/providers/types";
import { aggregateWeekly } from "@/components/charts/CandleChart";

export interface PricesRouteDeps {
  jquants?: JQuantsClient;
  alpha?: AlphaVantageClient;
  yahoo?: YahooFinanceClient;
  now?: () => number;
}

export type PricesMarket = "jp" | "us";
export type PricesInterval = "1d" | "1w";
export type PriceDataSource = "jquants" | "alphaVantage" | "yahoo";

export interface PriceSeriesResult {
  candles: Candle[];
  source: PriceDataSource;
  fallbackReason?: string;
}

function isoDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}
function offsetIso(ts: number, days: number): string {
  return isoDate(ts + days * 24 * 60 * 60 * 1000);
}

export async function fetchPriceSeries(
  symbol: string,
  market: PricesMarket,
  days: number,
  deps: PricesRouteDeps,
): Promise<PriceSeriesResult> {
  const now = deps.now ?? Date.now;
  const yahoo = deps.yahoo ?? createYahooFinanceClient({ now });
  const normalizedDays = Math.max(7, days);
  const tail = (candles: Candle[]): Candle[] =>
    candles.length <= normalizedDays
      ? candles
      : candles.slice(candles.length - normalizedDays);

  if (market === "jp") {
    const jq = deps.jquants ?? createJQuantsClient();
    const to = isoDate(now());
    const from = offsetIso(now(), -normalizedDays);
    try {
      const candles = await jq.getDailyQuotes(symbol, from, to);
      if (candles.length === 0) {
        throw new Error("J-Quants returned empty candle series");
      }
      return { candles: tail(candles), source: "jquants" };
    } catch (primaryError) {
      const primaryMessage =
        primaryError instanceof Error ? primaryError.message : String(primaryError);
      try {
        const fallbackCandles = await yahoo.getDailyCandles(symbol, {
          market: "jp",
          days: normalizedDays,
        });
        return {
          candles: tail(fallbackCandles),
          source: "yahoo",
          fallbackReason: `J-Quants failed: ${primaryMessage}`,
        };
      } catch (fallbackError) {
        const fallbackMessage =
          fallbackError instanceof Error
            ? fallbackError.message
            : String(fallbackError);
        throw new Error(
          `Failed to fetch JP prices for ${symbol}. J-Quants failed: ${primaryMessage}. Yahoo failed: ${fallbackMessage}.`,
        );
      }
    }
  }

  const av = deps.alpha ?? createAlphaVantageClient();
  try {
    const all = await av.getDailyAdjusted(symbol);
    if (all.length === 0) {
      throw new Error("Alpha Vantage returned empty candle series");
    }
    return {
      candles: tail(all),
      source: "alphaVantage",
    };
  } catch (primaryError) {
    const primaryMessage =
      primaryError instanceof Error ? primaryError.message : String(primaryError);
    try {
      const fallbackCandles = await yahoo.getDailyCandles(symbol, {
        market: "us",
        days: normalizedDays,
      });
      return {
        candles: tail(fallbackCandles),
        source: "yahoo",
        fallbackReason: `Alpha Vantage failed: ${primaryMessage}`,
      };
    } catch (fallbackError) {
      const fallbackMessage =
        fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      throw new Error(
        `Failed to fetch US prices for ${symbol}. Alpha Vantage failed: ${primaryMessage}. Yahoo failed: ${fallbackMessage}.`,
      );
    }
  }
}

export async function buildPriceResponse(
  symbol: string,
  market: PricesMarket,
  interval: PricesInterval,
  days: number,
  deps: PricesRouteDeps,
): Promise<{
  symbol: string;
  market: PricesMarket;
  interval: PricesInterval;
  days: number;
  candles: Candle[];
  count: number;
  source: PriceDataSource;
  fallbackReason: string | null;
}> {
  const fetched = await fetchPriceSeries(symbol, market, days, deps);
  const series =
    interval === "1w" ? aggregateWeekly(fetched.candles) : fetched.candles;
  return {
    symbol,
    market,
    interval,
    days,
    candles: series,
    count: series.length,
    source: fetched.source,
    fallbackReason: fetched.fallbackReason ?? null,
  };
}

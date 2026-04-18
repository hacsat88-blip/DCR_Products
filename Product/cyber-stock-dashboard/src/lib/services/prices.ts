import {
  createJQuantsClient,
  type JQuantsClient,
} from "@/lib/providers/jquants";
import {
  createAlphaVantageClient,
  type AlphaVantageClient,
} from "@/lib/providers/alphaVantage";
import type { Candle } from "@/lib/providers/types";
import { aggregateWeekly } from "@/components/charts/CandleChart";

export interface PricesRouteDeps {
  jquants?: JQuantsClient;
  alpha?: AlphaVantageClient;
  now?: () => number;
}

export type PricesMarket = "jp" | "us";
export type PricesInterval = "1d" | "1w";

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
): Promise<Candle[]> {
  const now = deps.now ?? Date.now;
  if (market === "jp") {
    const jq = deps.jquants ?? createJQuantsClient();
    const to = isoDate(now());
    const from = offsetIso(now(), -days);
    return jq.getDailyQuotes(symbol, from, to);
  }
  const av = deps.alpha ?? createAlphaVantageClient();
  const all = await av.getDailyAdjusted(symbol);
  if (all.length <= days) return all;
  return all.slice(all.length - days);
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
}> {
  const candles = await fetchPriceSeries(symbol, market, days, deps);
  const series = interval === "1w" ? aggregateWeekly(candles) : candles;
  return {
    symbol,
    market,
    interval,
    days,
    candles: series,
    count: series.length,
  };
}

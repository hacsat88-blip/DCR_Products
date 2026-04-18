import {
  createAlphaVantageClient,
  type AlphaVantageClient,
} from "@/lib/providers/alphaVantage";
import {
  createYahooFinanceClient,
  type YahooFinanceClient,
} from "@/lib/providers/yahooFinance";
import type { Candle } from "@/lib/providers/types";

export type IndexId = "N225" | "TOPIX" | "DJI" | "SPX" | "IXIC";
export type IndexRange = "daily" | "weekly";
export type IndexStatus = "ok" | "error";
export type IndexDataSource = "alphaVantage" | "yahoo" | "static";

export interface IndexDescriptor {
  id: IndexId;
  label: string;
  symbol: string;
  /** 1st priority source */
  primarySource: "alphaVantage" | "yahoo";
  /** Alpha Vantage を使う場合の代替シンボル (ETF proxy) */
  proxySymbol?: string;
  yahooSymbol: string;
  currency: "JPY" | "USD";
}

export const INDEX_REGISTRY: Record<IndexId, IndexDescriptor> = {
  N225: {
    id: "N225",
    label: "日経平均",
    symbol: "^N225",
    primarySource: "yahoo",
    yahooSymbol: "^N225",
    currency: "JPY",
  },
  TOPIX: {
    id: "TOPIX",
    label: "TOPIX",
    symbol: "^TOPX",
    primarySource: "yahoo",
    yahooSymbol: "^TOPX",
    currency: "JPY",
  },
  DJI: {
    id: "DJI",
    label: "NY ダウ",
    symbol: "^DJI",
    primarySource: "alphaVantage",
    proxySymbol: "DIA",
    yahooSymbol: "^DJI",
    currency: "USD",
  },
  SPX: {
    id: "SPX",
    label: "S&P 500",
    symbol: "^GSPC",
    primarySource: "alphaVantage",
    proxySymbol: "SPY",
    yahooSymbol: "^GSPC",
    currency: "USD",
  },
  IXIC: {
    id: "IXIC",
    label: "NASDAQ",
    symbol: "^IXIC",
    primarySource: "alphaVantage",
    proxySymbol: "QQQ",
    yahooSymbol: "^IXIC",
    currency: "USD",
  },
};

export const INDEX_IDS = Object.keys(INDEX_REGISTRY) as IndexId[];

export interface IndexResult {
  id: IndexId;
  label: string;
  symbol: string;
  source: IndexDataSource;
  proxySymbol?: string;
  currency: IndexDescriptor["currency"];
  status: IndexStatus;
  error?: string;
  fallbackReason?: string | null;
  data: Candle[];
  latest?: {
    date: string;
    close: number;
    change: number;
    changePercent: number;
  };
  range: IndexRange;
}

export interface MarketIndicesDeps {
  alpha?: AlphaVantageClient;
  yahoo?: YahooFinanceClient;
  now?: () => number;
}

const TRADING_DAYS = 60;
const YAHOO_LOOKBACK_DAYS = 400;

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function generateStaticCandles(seed: number, baseValue: number, nowMs: number): Candle[] {
  const out: Candle[] = [];
  let cursor = nowMs;
  let value = baseValue;
  let s = seed;
  while (out.length < TRADING_DAYS) {
    const d = new Date(cursor);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      const drift = (r - 0.5) * baseValue * 0.01;
      const open = value;
      value = Math.max(1, value + drift);
      const close = value;
      const high = Math.max(open, close) * (1 + Math.abs(r) * 0.003);
      const low = Math.min(open, close) * (1 - Math.abs(r) * 0.003);
      out.push({
        date: d.toISOString().slice(0, 10),
        open,
        high,
        low,
        close,
        volume: 0,
      });
    }
    cursor -= 24 * 60 * 60 * 1000;
  }
  return out.reverse();
}

export function toWeekly(candles: Candle[]): Candle[] {
  if (candles.length === 0) return [];
  const buckets = new Map<string, Candle[]>();
  for (const c of candles) {
    const d = new Date(c.date + "T00:00:00Z");
    const day = d.getUTCDay();
    const diff = (day + 6) % 7;
    const monday = new Date(d.getTime() - diff * 86400000);
    const key = monday.toISOString().slice(0, 10);
    const arr = buckets.get(key) ?? [];
    arr.push(c);
    buckets.set(key, arr);
  }
  const out: Candle[] = [];
  const keys = [...buckets.keys()].sort();
  for (const k of keys) {
    const arr = buckets.get(k)!;
    const open = arr[0].open;
    const close = arr[arr.length - 1].close;
    const high = Math.max(...arr.map((c) => c.high));
    const low = Math.min(...arr.map((c) => c.low));
    const volume = arr.reduce((s, c) => s + c.volume, 0);
    out.push({ date: k, open, high, low, close, volume });
  }
  return out;
}

function buildLatest(data: Candle[]): IndexResult["latest"] {
  if (data.length === 0) return undefined;
  const last = data[data.length - 1];
  const prev = data.length >= 2 ? data[data.length - 2] : last;
  const change = last.close - prev.close;
  const changePercent = prev.close !== 0 ? (change / prev.close) * 100 : 0;
  return { date: last.date, close: last.close, change, changePercent };
}

const STATIC_BASES: Record<IndexId, number> = {
  N225: 39000,
  TOPIX: 2700,
  DJI: 39000,
  SPX: 5200,
  IXIC: 16500,
};
const STATIC_SEEDS: Record<IndexId, number> = {
  N225: 0xa11ce,
  TOPIX: 0xb0b,
  DJI: 0xc0de,
  SPX: 0xfeed,
  IXIC: 0xbeef,
};

function applyRange(data: Candle[], range: IndexRange): Candle[] {
  return range === "weekly" ? toWeekly(data) : data;
}

function buildStaticFallback(
  desc: IndexDescriptor,
  range: IndexRange,
  nowMs: number,
  fallbackReason: string,
): IndexResult {
  const staticCandles = generateStaticCandles(
    STATIC_SEEDS[desc.id],
    STATIC_BASES[desc.id],
    nowMs,
  );
  const data = applyRange(staticCandles, range);
  return {
    id: desc.id,
    label: desc.label,
    symbol: desc.symbol,
    source: "static",
    proxySymbol: desc.proxySymbol,
    currency: desc.currency,
    status: "ok",
    fallbackReason,
    error: fallbackReason,
    data,
    latest: buildLatest(data),
    range,
  };
}

async function fetchYahoo(
  desc: IndexDescriptor,
  deps: MarketIndicesDeps,
): Promise<Candle[]> {
  const now = deps.now ?? Date.now;
  const yahoo = deps.yahoo ?? createYahooFinanceClient({ now });
  return yahoo.getDailyCandles(desc.yahooSymbol, {
    market: "us",
    days: YAHOO_LOOKBACK_DAYS,
  });
}

export async function getIndexSeries(
  id: IndexId,
  range: IndexRange = "daily",
  deps: MarketIndicesDeps = {},
): Promise<IndexResult> {
  const desc = INDEX_REGISTRY[id];
  if (!desc) {
    return {
      id,
      label: id,
      symbol: id,
      source: "static",
      currency: "USD",
      status: "error",
      error: `unknown index ${id}`,
      fallbackReason: null,
      data: [],
      range,
    };
  }

  const now = deps.now ?? Date.now;

  if (desc.primarySource === "alphaVantage") {
    try {
      const alpha = deps.alpha ?? createAlphaVantageClient();
      const target = desc.proxySymbol ?? desc.symbol;
      const candles = await alpha.getDailyAdjusted(target);
      const ranged = applyRange(candles, range).slice(-TRADING_DAYS);
      return {
        id: desc.id,
        label: desc.label,
        symbol: desc.symbol,
        source: "alphaVantage",
        proxySymbol: desc.proxySymbol,
        currency: desc.currency,
        status: "ok",
        fallbackReason: null,
        data: ranged,
        latest: buildLatest(ranged),
        range,
      };
    } catch (alphaError) {
      const alphaMessage = toErrorMessage(alphaError);
      try {
        const yahooCandles = await fetchYahoo(desc, deps);
        const ranged = applyRange(yahooCandles, range).slice(-TRADING_DAYS);
        const fallbackReason = `Alpha Vantage failed: ${alphaMessage}`;
        return {
          id: desc.id,
          label: desc.label,
          symbol: desc.symbol,
          source: "yahoo",
          proxySymbol: desc.proxySymbol,
          currency: desc.currency,
          status: "ok",
          fallbackReason,
          data: ranged,
          latest: buildLatest(ranged),
          range,
        };
      } catch (yahooError) {
        const yahooMessage = toErrorMessage(yahooError);
        const fallbackReason = `Alpha Vantage failed: ${alphaMessage}; Yahoo failed: ${yahooMessage}; static fallback used`;
        return buildStaticFallback(desc, range, now(), fallbackReason);
      }
    }
  }

  try {
    const yahooCandles = await fetchYahoo(desc, deps);
    const ranged = applyRange(yahooCandles, range).slice(-TRADING_DAYS);
    return {
      id: desc.id,
      label: desc.label,
      symbol: desc.symbol,
      source: "yahoo",
      currency: desc.currency,
      status: "ok",
      fallbackReason: null,
      data: ranged,
      latest: buildLatest(ranged),
      range,
    };
  } catch (yahooError) {
    const yahooMessage = toErrorMessage(yahooError);
    const fallbackReason = `Yahoo failed: ${yahooMessage}; static fallback used`;
    return buildStaticFallback(desc, range, now(), fallbackReason);
  }
}

export async function getAllIndices(
  range: IndexRange = "daily",
  deps: MarketIndicesDeps = {},
): Promise<IndexResult[]> {
  return Promise.all(INDEX_IDS.map((id) => getIndexSeries(id, range, deps)));
}

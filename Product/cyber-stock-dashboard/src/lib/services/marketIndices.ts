import {
  createAlphaVantageClient,
  type AlphaVantageClient,
} from "@/lib/providers/alphaVantage";
import type { Candle } from "@/lib/providers/types";

export type IndexId = "N225" | "TOPIX" | "DJI" | "SPX" | "IXIC";
export type IndexRange = "daily" | "weekly";
export type IndexStatus = "ok" | "error";

export interface IndexDescriptor {
  id: IndexId;
  label: string;
  symbol: string;
  /** どこから取得するか */
  source: "alphaVantage" | "static";
  /** Alpha Vantage を使う場合の代替シンボル (ETF proxy) */
  proxySymbol?: string;
  currency: "JPY" | "USD";
  note?: string;
}

export const INDEX_REGISTRY: Record<IndexId, IndexDescriptor> = {
  N225: {
    id: "N225",
    label: "日経平均",
    symbol: "^N225",
    source: "static",
    currency: "JPY",
    note: "Yahoo/J-Quants 指数 API 未契約のため静的フォールバック",
  },
  TOPIX: {
    id: "TOPIX",
    label: "TOPIX",
    symbol: "TOPIX",
    source: "static",
    currency: "JPY",
    note: "J-Quants 指数 API 未契約のため静的フォールバック",
  },
  DJI: {
    id: "DJI",
    label: "NY ダウ",
    symbol: "^DJI",
    source: "alphaVantage",
    proxySymbol: "DIA",
    currency: "USD",
  },
  SPX: {
    id: "SPX",
    label: "S&P 500",
    symbol: "^GSPC",
    source: "alphaVantage",
    proxySymbol: "SPY",
    currency: "USD",
  },
  IXIC: {
    id: "IXIC",
    label: "NASDAQ",
    symbol: "^IXIC",
    source: "alphaVantage",
    proxySymbol: "QQQ",
    currency: "USD",
  },
};

export const INDEX_IDS = Object.keys(INDEX_REGISTRY) as IndexId[];

export interface IndexResult {
  id: IndexId;
  label: string;
  symbol: string;
  source: IndexDescriptor["source"];
  proxySymbol?: string;
  currency: IndexDescriptor["currency"];
  status: IndexStatus;
  error?: string;
  data: Candle[];
  /** 最新終値・前日比など */
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
  /** 静的フォールバック生成のシード時刻 */
  now?: () => number;
}

const TRADING_DAYS = 60;

/** 営業日（土日除外）で N 日分の擬似データを生成 */
function generateStaticCandles(seed: number, baseValue: number, nowMs: number): Candle[] {
  const out: Candle[] = [];
  let cursor = nowMs;
  let value = baseValue;
  let s = seed;
  while (out.length < TRADING_DAYS) {
    const d = new Date(cursor);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      // 簡易乱数 (mulberry32)
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

/** Candle[] を週足 (週次最終営業日) にダウンサンプル */
export function toWeekly(candles: Candle[]): Candle[] {
  if (candles.length === 0) return [];
  const buckets = new Map<string, Candle[]>();
  for (const c of candles) {
    const d = new Date(c.date + "T00:00:00Z");
    // ISO週キー
    const day = d.getUTCDay();
    const diff = (day + 6) % 7; // Mon=0
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

/** 単一指数を取得。失敗を throw せず IndexResult として返す */
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
      data: [],
      range,
    };
  }

  const now = deps.now ?? Date.now;

  // alphaVantage 経路
  if (desc.source === "alphaVantage") {
    try {
      const alpha = deps.alpha ?? createAlphaVantageClient();
      const target = desc.proxySymbol ?? desc.symbol;
      const candles = await alpha.getDailyAdjusted(target);
      const ranged = applyRange(candles, range).slice(-TRADING_DAYS);
      return {
        id: desc.id,
        label: desc.label,
        symbol: desc.symbol,
        source: desc.source,
        proxySymbol: desc.proxySymbol,
        currency: desc.currency,
        status: "ok",
        data: ranged,
        latest: buildLatest(ranged),
        range,
      };
    } catch (e) {
      const fallback = generateStaticCandles(
        STATIC_SEEDS[id],
        STATIC_BASES[id],
        now(),
      );
      const ranged = applyRange(fallback, range);
      return {
        id: desc.id,
        label: desc.label,
        symbol: desc.symbol,
        source: desc.source,
        proxySymbol: desc.proxySymbol,
        currency: desc.currency,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
        data: ranged,
        latest: buildLatest(ranged),
        range,
      };
    }
  }

  // static 経路 — 取得失敗扱い (status: error) で擬似データを返す
  const fallback = generateStaticCandles(
    STATIC_SEEDS[id],
    STATIC_BASES[id],
    now(),
  );
  const ranged = applyRange(fallback, range);
  return {
    id: desc.id,
    label: desc.label,
    symbol: desc.symbol,
    source: desc.source,
    currency: desc.currency,
    status: "error",
    error: desc.note ?? "static fallback",
    data: ranged,
    latest: buildLatest(ranged),
    range,
  };
}

/** 全指数を並列取得 */
export async function getAllIndices(
  range: IndexRange = "daily",
  deps: MarketIndicesDeps = {},
): Promise<IndexResult[]> {
  return Promise.all(INDEX_IDS.map((id) => getIndexSeries(id, range, deps)));
}

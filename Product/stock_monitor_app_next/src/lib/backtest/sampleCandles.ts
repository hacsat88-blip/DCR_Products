import type { Candle } from "@/lib/backtest/engine";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Seeded random-walk candle generator. Used by the backtest UI for
 * "サンプルデータで実行" demonstrations when no live price feed is wired.
 */
export function generateSampleCandles(from: string, to: string, seed = 42): Candle[] {
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
  const rand = mulberry32(seed);
  const candles: Candle[] = [];
  let price = 100 + rand() * 20;
  const day = 86400_000;
  for (let t = start; t <= end; t += day) {
    const drift = 0.0003;
    const shock = (rand() - 0.5) * 0.04;
    const openPrice = price;
    const closePrice = Math.max(1, openPrice * (1 + drift + shock));
    const high = Math.max(openPrice, closePrice) * (1 + rand() * 0.01);
    const low = Math.min(openPrice, closePrice) * (1 - rand() * 0.01);
    candles.push({
      t: Math.floor(t / 1000),
      o: openPrice,
      h: high,
      l: low,
      c: closePrice,
      v: Math.floor(rand() * 10_000),
    });
    price = closePrice;
  }
  return candles;
}

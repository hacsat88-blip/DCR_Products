import { describe, it, expect } from "vitest";

import { runBacktest, type Candle, type BacktestConfig } from "@/lib/backtest/engine";

function makeCandles(closes: number[], startT = 1_700_000_000): Candle[] {
  return closes.map((c, i) => ({
    t: startT + i * 86400,
    o: c,
    h: c * 1.01,
    l: c * 0.99,
    c,
    v: 1000,
  }));
}

describe("runBacktest", () => {
  it("buy_and_hold matches the raw price return minus fees/slippage", () => {
    const candles = makeCandles([100, 110, 115, 120, 130]);
    const config: BacktestConfig = {
      initialCapital: 10_000,
      feePct: 0.002,
      slippagePct: 0.0005,
      strategy: "buy_and_hold",
      params: {},
    };
    const result = runBacktest(candles, config);
    const rawReturnPct = (130 / 100 - 1) * 100; // 30
    expect(result.metrics.totalReturnPct).toBeLessThan(rawReturnPct);
    expect(result.metrics.totalReturnPct).toBeGreaterThan(rawReturnPct - 2);
    expect(result.metrics.tradeCount).toBe(1);
    expect(result.equity).toHaveLength(candles.length);
  });

  it("sma_cross generates at least one trade on an oscillating series and winRate is bounded", () => {
    const oscillating = Array.from({ length: 60 }, (_, i) =>
      100 + Math.sin(i / 3) * 15 + i * 0.2,
    );
    const candles = makeCandles(oscillating);
    const config: BacktestConfig = {
      initialCapital: 10_000,
      feePct: 0.001,
      slippagePct: 0.0005,
      strategy: "sma_cross",
      params: { fast: 3, slow: 10 },
    };
    const result = runBacktest(candles, config);
    expect(result.metrics.tradeCount).toBeGreaterThanOrEqual(1);
    expect(result.metrics.winRate).toBeGreaterThanOrEqual(0);
    expect(result.metrics.winRate).toBeLessThanOrEqual(100);
  });

  it("max drawdown is non-negative and equity curve length equals input", () => {
    const closes = [100, 120, 90, 80, 110, 130, 95, 140];
    const candles = makeCandles(closes);
    const result = runBacktest(candles, {
      initialCapital: 10_000,
      feePct: 0.001,
      slippagePct: 0.0005,
      strategy: "buy_and_hold",
      params: {},
    });
    expect(result.metrics.maxDrawdownPct).toBeGreaterThanOrEqual(0);
    expect(result.equity.length).toBe(closes.length);
  });

  it("rsi_reversion runs on trending + mean-reverting series without throwing", () => {
    const closes = Array.from({ length: 80 }, (_, i) =>
      100 + Math.sin(i / 4) * 20,
    );
    const candles = makeCandles(closes);
    const result = runBacktest(candles, {
      initialCapital: 10_000,
      feePct: 0.001,
      slippagePct: 0.0005,
      strategy: "rsi_reversion",
      params: { period: 14, oversold: 30, overbought: 70 },
    });
    expect(result.trades.length).toBeGreaterThanOrEqual(0);
    expect(result.metrics.maxDrawdownPct).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result.metrics.sharpe)).toBe(true);
  });

  it("empty candle input returns zero metrics", () => {
    const result = runBacktest([], {
      initialCapital: 10_000,
      feePct: 0,
      slippagePct: 0,
      strategy: "buy_and_hold",
      params: {},
    });
    expect(result.metrics.tradeCount).toBe(0);
    expect(result.equity).toHaveLength(0);
  });
});

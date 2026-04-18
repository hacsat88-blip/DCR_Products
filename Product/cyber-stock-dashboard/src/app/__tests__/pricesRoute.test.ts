import { describe, it, expect, vi } from "vitest";
import { buildPriceResponse } from "@/lib/services/prices";

const jpCandles = [
  { date: "2025-01-01", open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
  { date: "2025-01-02", open: 1.5, high: 2.5, low: 1, close: 2, volume: 110 },
];

const usCandles = Array.from({ length: 30 }, (_, i) => {
  const d = String(i + 1).padStart(2, "0");
  return {
    date: `2025-01-${d}`,
    open: 100 + i,
    high: 102 + i,
    low: 99 + i,
    close: 101 + i,
    volume: 1000,
  };
});

describe("prices service", () => {
  it("returns JP candles via jquants", async () => {
    const jq = {
      getDailyQuotes: vi.fn(async () => jpCandles),
      getIdToken: vi.fn(),
      getListedInfo: vi.fn(),
      getDailyQuotesByDate: vi.fn(),
    };
    const out = await buildPriceResponse("7203", "jp", "1d", 30, {
      jquants: jq,
      now: () => Date.parse("2025-02-01"),
    });
    expect(out.candles).toHaveLength(2);
    expect(jq.getDailyQuotes).toHaveBeenCalledWith(
      "7203",
      expect.any(String),
      expect.any(String),
    );
  });

  it("returns US daily candles via alpha vantage and slices days", async () => {
    const alpha = {
      getDailyAdjusted: vi.fn(async () => usCandles),
      getQuote: vi.fn(),
      getFxRate: vi.fn(),
    };
    const out = await buildPriceResponse("AAPL", "us", "1d", 10, { alpha });
    expect(out.candles).toHaveLength(10);
    expect(out.candles[0].date).toBe("2025-01-21");
  });

  it("supports weekly aggregation", async () => {
    const alpha = {
      getDailyAdjusted: vi.fn(async () => usCandles),
      getQuote: vi.fn(),
      getFxRate: vi.fn(),
    };
    const out = await buildPriceResponse("AAPL", "us", "1w", 30, { alpha });
    expect(out.interval).toBe("1w");
    expect(out.candles.length).toBeLessThan(usCandles.length);
    expect(out.candles.length).toBeGreaterThan(0);
  });

  it("propagates provider errors", async () => {
    const alpha = {
      getDailyAdjusted: vi.fn(async () => {
        throw new Error("rate limited");
      }),
      getQuote: vi.fn(),
      getFxRate: vi.fn(),
    };
    await expect(
      buildPriceResponse("AAPL", "us", "1d", 30, { alpha }),
    ).rejects.toThrow(/rate limited/);
  });
});

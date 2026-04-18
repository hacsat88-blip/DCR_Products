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
      yahoo: { getDailyCandles: vi.fn() },
      now: () => Date.parse("2025-02-01"),
    });
    expect(out.candles).toHaveLength(2);
    expect(out.source).toBe("jquants");
    expect(out.fallbackReason).toBeNull();
    expect(jq.getDailyQuotes).toHaveBeenCalledWith(
      "7203",
      expect.any(String),
      expect.any(String),
    );
  });

  it("falls back to Yahoo for JP when J-Quants fails", async () => {
    const jq = {
      getDailyQuotes: vi.fn(async () => {
        throw new Error("jquants rate limited");
      }),
      getIdToken: vi.fn(),
      getListedInfo: vi.fn(),
      getDailyQuotesByDate: vi.fn(),
    };
    const yahooCandles = [{ ...jpCandles[0], adjustedClose: 1.45 }];
    const yahoo = { getDailyCandles: vi.fn(async () => yahooCandles) };

    const out = await buildPriceResponse("7203", "jp", "1d", 30, {
      jquants: jq,
      yahoo,
      now: () => Date.parse("2025-02-01"),
    });

    expect(out.source).toBe("yahoo");
    expect(out.candles).toHaveLength(1);
    expect(out.fallbackReason).toMatch(/J-Quants failed/i);
    expect(yahoo.getDailyCandles).toHaveBeenCalledWith("7203", {
      market: "jp",
      days: 30,
    });
  });

  it("returns US daily candles via alpha vantage and slices days", async () => {
    const alpha = {
      getDailyAdjusted: vi.fn(async () => usCandles),
      getQuote: vi.fn(),
      getFxRate: vi.fn(),
    };
    const out = await buildPriceResponse("AAPL", "us", "1d", 10, {
      alpha,
      yahoo: { getDailyCandles: vi.fn() },
    });
    expect(out.candles).toHaveLength(10);
    expect(out.candles[0].date).toBe("2025-01-21");
    expect(out.source).toBe("alphaVantage");
    expect(out.fallbackReason).toBeNull();
  });

  it("supports weekly aggregation", async () => {
    const alpha = {
      getDailyAdjusted: vi.fn(async () => usCandles),
      getQuote: vi.fn(),
      getFxRate: vi.fn(),
    };
    const out = await buildPriceResponse("AAPL", "us", "1w", 30, {
      alpha,
      yahoo: { getDailyCandles: vi.fn() },
    });
    expect(out.interval).toBe("1w");
    expect(out.candles.length).toBeLessThan(usCandles.length);
    expect(out.candles.length).toBeGreaterThan(0);
  });

  it("falls back to Yahoo for US when Alpha Vantage fails", async () => {
    const alpha = {
      getDailyAdjusted: vi.fn(async () => {
        throw new Error("rate limited");
      }),
      getQuote: vi.fn(),
      getFxRate: vi.fn(),
    };
    const yahoo = {
      getDailyCandles: vi.fn(async () => usCandles.slice(-20)),
    };

    const out = await buildPriceResponse("AAPL", "us", "1d", 20, {
      alpha,
      yahoo,
    });

    expect(out.source).toBe("yahoo");
    expect(out.candles).toHaveLength(20);
    expect(out.fallbackReason).toMatch(/Alpha Vantage failed/i);
  });

  it("throws meaningful error when both primary and Yahoo fail", async () => {
    const alpha = {
      getDailyAdjusted: vi.fn(async () => {
        throw new Error("alpha unavailable");
      }),
      getQuote: vi.fn(),
      getFxRate: vi.fn(),
    };
    const yahoo = {
      getDailyCandles: vi.fn(async () => {
        throw new Error("yahoo unavailable");
      }),
    };

    await expect(
      buildPriceResponse("AAPL", "us", "1d", 30, { alpha, yahoo }),
    ).rejects.toThrow(/Alpha Vantage.*Yahoo/i);
  });
});

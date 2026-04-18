import { describe, it, expect, vi } from "vitest";
import {
  fetchJpCandidates,
  fetchUsCandidates,
  buildUsSymbolPool,
} from "../candidatePool";
import { US_ETF_ALLOWLIST } from "../etfList";

describe("buildUsSymbolPool", () => {
  it("includes individuals and ETFs by default", () => {
    const pool = buildUsSymbolPool();
    expect(pool.length).toBeGreaterThan(US_ETF_ALLOWLIST.length);
    expect(pool.some((p) => p.symbol === "SPY")).toBe(true);
    expect(pool.some((p) => p.symbol === "AAPL")).toBe(true);
  });
  it("can exclude ETFs", () => {
    const pool = buildUsSymbolPool({ includeEtf: false });
    expect(pool.some((p) => p.symbol === "SPY")).toBe(false);
  });
  it("can exclude stocks", () => {
    const pool = buildUsSymbolPool({ includeStocks: false });
    expect(pool.every((p) =>
      US_ETF_ALLOWLIST.some((e) => e.code === p.symbol),
    )).toBe(true);
  });
});

describe("fetchJpCandidates", () => {
  it("filters by price range and sorts by volume desc", async () => {
    const jquants = {
      getListedInfo: vi.fn().mockResolvedValue([
        { Code: "73200", CompanyName: "TOYOTA" },
        { Code: "9984", CompanyName: "SOFTBANK" },
        { Code: "13060", CompanyName: "TOPIX ETF" }, // ETF -> 1306
        { Code: "1234", CompanyName: "OUT OF RANGE" },
      ]),
      getDailyQuotesByDate: vi.fn().mockResolvedValue([
        {
          code: "7320",
          date: "2024-01-04",
          open: 0,
          high: 0,
          low: 0,
          close: 2500,
          volume: 100,
        },
        {
          code: "9984",
          date: "2024-01-04",
          open: 0,
          high: 0,
          low: 0,
          close: 7000,
          volume: 500,
        },
        {
          code: "1306",
          date: "2024-01-04",
          open: 0,
          high: 0,
          low: 0,
          close: 2200,
          volume: 1000,
        },
        {
          code: "1234",
          date: "2024-01-04",
          open: 0,
          high: 0,
          low: 0,
          close: 50000,
          volume: 999,
        }, // out of range
      ]),
    };
    const out = await fetchJpCandidates(
      { jquants, date: "2024-01-04" },
      { priceMin: 1000, priceMax: 8000 },
    );
    expect(out.map((c) => c.code)).toEqual(["1306", "9984", "7320"]);
    expect(out[0].isEtf).toBe(true);
    expect(out[0].name).toContain("TOPIX");
  });

  it("respects includeEtf=false", async () => {
    const jquants = {
      getListedInfo: vi.fn().mockResolvedValue([]),
      getDailyQuotesByDate: vi.fn().mockResolvedValue([
        {
          code: "1306",
          date: "2024-01-04",
          open: 0,
          high: 0,
          low: 0,
          close: 2200,
          volume: 100,
        },
        {
          code: "7203",
          date: "2024-01-04",
          open: 0,
          high: 0,
          low: 0,
          close: 2500,
          volume: 100,
        },
      ]),
    };
    const out = await fetchJpCandidates(
      { jquants, date: "2024-01-04" },
      { priceMin: 0, priceMax: 100000, includeEtf: false },
    );
    expect(out.find((c) => c.code === "1306")).toBeUndefined();
    expect(out.find((c) => c.code === "7203")).toBeDefined();
  });
});

describe("fetchUsCandidates", () => {
  it("filters by price range using Alpha Vantage quote", async () => {
    const getQuote = vi.fn(async (symbol: string) => {
      const map: Record<string, number> = {
        AAPL: 200,
        MSFT: 400,
        SPY: 500,
        QQQ: 450,
      };
      return {
        symbol,
        price: map[symbol] ?? 1500,
        currency: "USD" as const,
        timestamp: "2024-01-04",
      };
    });
    const out = await fetchUsCandidates(
      // maxSymbols=50 ensures both individuals and ETFs are scanned
      { alphaVantage: { getQuote }, concurrency: 2, maxSymbols: 50 },
      { priceMin: 100, priceMax: 480 },
    );
    const symbols = out.map((c) => c.code).sort();
    expect(symbols).toContain("AAPL");
    expect(symbols).toContain("MSFT");
    expect(symbols).toContain("QQQ");
    expect(symbols).not.toContain("SPY");
    expect(out.find((c) => c.code === "QQQ")?.isEtf).toBe(true);
  });

  it("ignores symbol-level errors", async () => {
    const getQuote = vi.fn(async (symbol: string) => {
      if (symbol === "AAPL") throw new Error("rate limit");
      return {
        symbol,
        price: 100,
        currency: "USD" as const,
        timestamp: "2024-01-04",
      };
    });
    const out = await fetchUsCandidates(
      { alphaVantage: { getQuote }, concurrency: 2, maxSymbols: 3 },
      { priceMin: 0, priceMax: 1000 },
    );
    expect(out.length).toBe(2);
  });
});

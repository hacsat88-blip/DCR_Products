import { describe, it, expect, vi } from "vitest";
import {
  getIndexSeries,
  getAllIndices,
  toWeekly,
  INDEX_IDS,
} from "@/lib/services/marketIndices";
import type { Candle } from "@/lib/providers/types";
import type { AlphaVantageClient } from "@/lib/providers/alphaVantage";
import type { YahooFinanceClient } from "@/lib/providers/yahooFinance";

function makeCandles(n: number): Candle[] {
  const out: Candle[] = [];
  const start = new Date("2025-01-06T00:00:00Z").getTime();
  let v = 100;
  for (let i = 0; i < n; i++) {
    v += i % 2 === 0 ? 0.5 : -0.3;
    const d = new Date(start + i * 86400000);
    out.push({
      date: d.toISOString().slice(0, 10),
      open: v,
      high: v + 0.5,
      low: v - 0.5,
      close: v,
      volume: 1000,
    });
  }
  return out;
}

function mockAlpha(impl: () => Promise<Candle[]>): AlphaVantageClient {
  return {
    getDailyAdjusted: vi.fn(impl),
    getQuote: vi.fn(),
    getFxRate: vi.fn(),
  } as unknown as AlphaVantageClient;
}

function mockYahoo(impl: () => Promise<Candle[]>): YahooFinanceClient {
  return {
    getDailyCandles: vi.fn(impl),
  } as unknown as YahooFinanceClient;
}

describe("marketIndices.getIndexSeries", () => {
  it("returns ok with data for alphaVantage-backed index", async () => {
    const candles = makeCandles(40);
    const res = await getIndexSeries("SPX", "daily", {
      alpha: mockAlpha(async () => candles),
      yahoo: mockYahoo(async () => makeCandles(40)),
    });
    expect(res.status).toBe("ok");
    expect(res.source).toBe("alphaVantage");
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.latest).toBeDefined();
    expect(res.id).toBe("SPX");
  });

  it("falls back to Yahoo when Alpha Vantage fails", async () => {
    const res = await getIndexSeries("DJI", "daily", {
      alpha: mockAlpha(async () => {
        throw new Error("boom");
      }),
      yahoo: mockYahoo(async () => makeCandles(45)),
      now: () => new Date("2025-06-02T00:00:00Z").getTime(),
    });
    expect(res.status).toBe("ok");
    expect(res.source).toBe("yahoo");
    expect(res.fallbackReason).toContain("Alpha Vantage failed");
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.latest).toBeDefined();
  });

  it("falls back to static data when both Alpha and Yahoo fail", async () => {
    const res = await getIndexSeries("SPX", "daily", {
      alpha: mockAlpha(async () => {
        throw new Error("alpha down");
      }),
      yahoo: mockYahoo(async () => {
        throw new Error("yahoo down");
      }),
      now: () => new Date("2025-06-02T00:00:00Z").getTime(),
    });
    expect(res.status).toBe("ok");
    expect(res.source).toBe("static");
    expect(res.fallbackReason).toContain("Alpha Vantage failed");
    expect(res.fallbackReason).toContain("Yahoo failed");
    expect(res.data.length).toBeGreaterThan(20);
  });

  it("JP indices prefer Yahoo", async () => {
    const res = await getIndexSeries("N225", "daily", {
      yahoo: mockYahoo(async () => makeCandles(45)),
      now: () => new Date("2025-06-02T00:00:00Z").getTime(),
    });
    expect(res.status).toBe("ok");
    expect(res.source).toBe("yahoo");
    expect(res.fallbackReason).toBeNull();
    expect(res.data.length).toBeGreaterThan(20);
    expect(res.id).toBe("N225");
  });

  it("JP indices use static only when Yahoo fails", async () => {
    const res = await getIndexSeries("TOPIX", "daily", {
      yahoo: mockYahoo(async () => {
        throw new Error("no index");
      }),
      now: () => new Date("2025-06-02T00:00:00Z").getTime(),
    });
    expect(res.status).toBe("ok");
    expect(res.source).toBe("static");
    expect(res.fallbackReason).toContain("Yahoo failed");
    expect(res.data.length).toBeGreaterThan(20);
  });

  it("weekly range downsamples", async () => {
    const candles = makeCandles(30);
    const res = await getIndexSeries("SPX", "weekly", {
      alpha: mockAlpha(async () => candles),
      yahoo: mockYahoo(async () => makeCandles(30)),
    });
    expect(res.status).toBe("ok");
    expect(res.data.length).toBeLessThan(candles.length);
    expect(res.range).toBe("weekly");
  });
});

describe("marketIndices.getAllIndices", () => {
  it("returns one entry per registered index", async () => {
    const items = await getAllIndices("daily", {
      alpha: mockAlpha(async () => makeCandles(40)),
      yahoo: mockYahoo(async () => makeCandles(40)),
      now: () => new Date("2025-06-02T00:00:00Z").getTime(),
    });
    expect(items.length).toBe(INDEX_IDS.length);
    const ids = items.map((i) => i.id).sort();
    expect(ids).toEqual([...INDEX_IDS].sort());
  });
});

describe("marketIndices.toWeekly", () => {
  it("groups candles into weekly buckets", () => {
    const w = toWeekly(makeCandles(14));
    expect(w.length).toBeGreaterThan(0);
    expect(w.length).toBeLessThanOrEqual(4);
  });
  it("returns empty for empty input", () => {
    expect(toWeekly([])).toEqual([]);
  });
});

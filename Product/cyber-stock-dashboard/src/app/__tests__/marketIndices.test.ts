import { describe, it, expect, vi } from "vitest";
import {
  getIndexSeries,
  getAllIndices,
  toWeekly,
  INDEX_IDS,
} from "@/lib/services/marketIndices";
import type { Candle } from "@/lib/providers/types";
import type { AlphaVantageClient } from "@/lib/providers/alphaVantage";

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

describe("marketIndices.getIndexSeries", () => {
  it("returns ok with data for alphaVantage-backed index", async () => {
    const candles = makeCandles(40);
    const res = await getIndexSeries("SPX", "daily", {
      alpha: mockAlpha(async () => candles),
    });
    expect(res.status).toBe("ok");
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.latest).toBeDefined();
    expect(res.id).toBe("SPX");
  });

  it("falls back to static data with status='error' when provider throws", async () => {
    const res = await getIndexSeries("DJI", "daily", {
      alpha: mockAlpha(async () => {
        throw new Error("boom");
      }),
      now: () => new Date("2025-06-02T00:00:00Z").getTime(),
    });
    expect(res.status).toBe("error");
    expect(res.error).toContain("boom");
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.latest).toBeDefined();
  });

  it("static-source indices return fallback data without hard error status", async () => {
    const res = await getIndexSeries("N225", "daily", {
      now: () => new Date("2025-06-02T00:00:00Z").getTime(),
    });
    expect(res.status).toBe("ok");
    expect(res.error).toContain("静的フォールバック");
    expect(res.data.length).toBeGreaterThan(20);
    expect(res.id).toBe("N225");
  });

  it("weekly range downsamples", async () => {
    const candles = makeCandles(30);
    const res = await getIndexSeries("SPX", "weekly", {
      alpha: mockAlpha(async () => candles),
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

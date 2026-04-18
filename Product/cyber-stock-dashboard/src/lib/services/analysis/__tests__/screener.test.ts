import { describe, it, expect, vi } from "vitest";
import { createTestDb } from "@/lib/db/__tests__/helper";
import { screenCandidates, ScreenerRequestSchema } from "../screener";
import type { StockAnalysis } from "@/lib/llm/schemas";

function makeAnalysis(code: string, totalScore = 80): StockAnalysis {
  return {
    code,
    name: `name-${code}`,
    scores: { a: 80, b: 70, c: 60, d: 75, e: 65 },
    totalScore,
    scenarios: {
      short: { up: "+5%", mid: "0%", down: "-5%", confidence: "mid", evidence: "B" },
      mid: { up: "+10%", mid: "0%", down: "-10%", confidence: "mid", evidence: "B" },
      long: { up: "+30%", mid: "+5%", down: "-20%", confidence: "low", evidence: "C" },
    },
    risks: ["risk1"],
    catalysts: ["cat1"],
    unknowns: ["u1"],
  };
}

const jpDeps = {
  jquants: {
    getListedInfo: vi.fn().mockResolvedValue([
      { Code: "7203", CompanyName: "TOYOTA" },
      { Code: "9984", CompanyName: "SOFTBANK" },
    ]),
    getDailyQuotesByDate: vi.fn().mockResolvedValue([
      { code: "7203", date: "2024-01-04", open: 0, high: 0, low: 0, close: 2500, volume: 1000 },
      { code: "9984", date: "2024-01-04", open: 0, high: 0, low: 0, close: 7000, volume: 500 },
    ]),
  },
  date: "2024-01-04",
};

describe("ScreenerRequestSchema", () => {
  it("rejects priceMax > JP limit", () => {
    const r = ScreenerRequestSchema.safeParse({
      market: "JP",
      priceMin: 0,
      priceMax: 200000,
    });
    expect(r.success).toBe(false);
  });
  it("rejects priceMax > US limit", () => {
    const r = ScreenerRequestSchema.safeParse({
      market: "US",
      priceMin: 0,
      priceMax: 1500,
    });
    expect(r.success).toBe(false);
  });
  it("accepts valid JP request", () => {
    const r = ScreenerRequestSchema.safeParse({
      market: "JP",
      priceMin: 0,
      priceMax: 5000,
    });
    expect(r.success).toBe(true);
  });
});

describe("screenCandidates", () => {
  it("uses LLM on cache miss and stores in cache", async () => {
    const db = createTestDb() as never;
    const analyze = vi
      .fn()
      .mockImplementation(async ({ code }: { code: string }) =>
        makeAnalysis(code),
      );

    const req = ScreenerRequestSchema.parse({
      market: "JP",
      priceMin: 1000,
      priceMax: 10000,
      style: "総合",
      riskTolerance: "mid",
      limit: 5,
    });

    const result = await screenCandidates(req, {
      db,
      jp: jpDeps,
      analyze,
      today: () => "2024-01-04",
    });

    expect(result.cacheMisses).toBe(2);
    expect(result.cacheHits).toBe(0);
    expect(result.analyses).toHaveLength(2);
    expect(analyze).toHaveBeenCalledTimes(2);

    // Re-run -> cache hit
    const result2 = await screenCandidates(req, {
      db,
      jp: jpDeps,
      analyze,
      today: () => "2024-01-04",
    });
    expect(result2.cacheHits).toBe(2);
    expect(result2.cacheMisses).toBe(0);
    expect(analyze).toHaveBeenCalledTimes(2); // not called again
  });

  it("returns warning on empty pool", async () => {
    const db = createTestDb() as never;
    const req = ScreenerRequestSchema.parse({
      market: "JP",
      priceMin: 50000,
      priceMax: 60000,
      style: "総合",
      riskTolerance: "mid",
    });
    const result = await screenCandidates(req, {
      db,
      jp: jpDeps,
      analyze: vi.fn(),
      today: () => "2024-01-04",
    });
    expect(result.analyses).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("captures warning when LLM throws and produces empty array gracefully", async () => {
    const db = createTestDb() as never;
    const analyze = vi.fn().mockRejectedValue(new Error("LLM down"));
    const req = ScreenerRequestSchema.parse({
      market: "JP",
      priceMin: 1000,
      priceMax: 10000,
      style: "総合",
      riskTolerance: "mid",
    });
    const result = await screenCandidates(req, {
      db,
      jp: jpDeps,
      analyze,
      today: () => "2024-01-04",
    });
    expect(result.analyses).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("sorts by totalScore desc and applies limit", async () => {
    const db = createTestDb() as never;
    let n = 60;
    const analyze = vi
      .fn()
      .mockImplementation(async ({ code }: { code: string }) => {
        n += 10;
        return makeAnalysis(code, n);
      });
    const req = ScreenerRequestSchema.parse({
      market: "JP",
      priceMin: 1000,
      priceMax: 10000,
      limit: 1,
    });
    const result = await screenCandidates(req, {
      db,
      jp: jpDeps,
      analyze,
      today: () => "2024-01-04",
    });
    expect(result.analyses).toHaveLength(1);
    expect(result.analyses[0].totalScore).toBeGreaterThanOrEqual(70);
  });
});

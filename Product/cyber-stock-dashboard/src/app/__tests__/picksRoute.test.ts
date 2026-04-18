import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/services/analysis/screener", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/services/analysis/screener")
  >("@/lib/services/analysis/screener");
  return {
    ...actual,
    screenCandidates: vi.fn(),
  };
});

import { buildPicks } from "@/lib/services/picks";
import { screenCandidates } from "@/lib/services/analysis/screener";

const screenMock = vi.mocked(screenCandidates);

const sampleAnalysis = {
  code: "AAPL",
  name: "Apple",
  scores: { a: 80, b: 70, c: 60, d: 75, e: 65 },
  totalScore: 72,
  scenarios: {
    short: { up: "u", mid: "m", down: "d", confidence: "mid" as const, evidence: "B" as const },
    mid: { up: "u", mid: "m", down: "d", confidence: "mid" as const, evidence: "B" as const },
    long: { up: "u", mid: "m", down: "d", confidence: "mid" as const, evidence: "B" as const },
  },
  risks: [] as string[],
  catalysts: [] as string[],
  unknowns: [] as string[],
};

const baseCandidates = [
  {
    code: "AAPL",
    name: "Apple",
    market: "US" as const,
    price: 220,
    currency: "USD" as const,
    isEtf: false,
  },
  {
    code: "7203",
    name: "トヨタ",
    market: "JP" as const,
    price: 2800,
    currency: "JPY" as const,
    isEtf: false,
  },
];

describe("picks service", () => {
  beforeEach(() => screenMock.mockReset());

  it("returns analyzed picks first then fills with candidates", async () => {
    screenMock.mockResolvedValue({
      analyses: [sampleAnalysis],
      candidates: baseCandidates,
      cacheHits: 0,
      cacheMisses: 1,
      warnings: [],
    });
    const out = await buildPicks({});
    expect(out.items).toHaveLength(2);
    expect(out.items[0].symbol).toBe("AAPL");
    expect(out.items[0].analysis).toBeTruthy();
    expect(out.items[1].symbol).toBe("7203");
    expect(out.items[1].analysis).toBeUndefined();
    expect(out.disclaimer).toContain("情報提供");
  });

  it("returns empty items when screener yields no analyses or candidates", async () => {
    screenMock.mockResolvedValue({
      analyses: [],
      candidates: [],
      cacheHits: 0,
      cacheMisses: 0,
      warnings: ["empty pool"],
    });
    const out = await buildPicks({});
    expect(out.items).toEqual([]);
    expect(out.warnings).toEqual(["empty pool"]);
  });

  it("dedupes when analysis covers candidate", async () => {
    screenMock.mockResolvedValue({
      analyses: [sampleAnalysis],
      candidates: baseCandidates,
      cacheHits: 0,
      cacheMisses: 0,
      warnings: ["w1"],
    });
    const out = await buildPicks({});
    expect(out.items.map((i) => i.symbol)).toEqual(["AAPL", "7203"]);
    expect(out.warnings).toEqual(["w1"]);
  });
});

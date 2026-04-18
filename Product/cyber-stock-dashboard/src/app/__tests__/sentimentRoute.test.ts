import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/services/marketIndices", () => ({
  getAllIndices: vi.fn(async () => [
    {
      id: "SPX",
      label: "S&P 500",
      symbol: "^GSPC",
      source: "alphaVantage",
      currency: "USD",
      status: "ok",
      data: [],
      latest: { date: "2025-01-02", close: 101, change: 0.5, changePercent: 0.5 },
      range: "daily",
    },
    {
      id: "DJI",
      label: "NY ダウ",
      symbol: "^DJI",
      source: "alphaVantage",
      currency: "USD",
      status: "ok",
      data: [],
      latest: { date: "2025-01-02", close: 38000, change: -50, changePercent: -0.13 },
      range: "daily",
    },
  ]),
}));

vi.mock("@/lib/llm/router", () => ({
  detectMarketAnomaly: vi.fn(async () => ({
    signal: "🟢",
    level: "normal",
    reasons: ["test"],
    recommendedAction: "monitor",
  })),
}));

import { GET } from "@/app/api/market/sentiment/route";

const ORIG = process.env.OPENROUTER_API_KEY;

describe("/api/market/sentiment route", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    if (ORIG === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = ORIG;
  });

  it("returns heuristic signal when OPENROUTER_API_KEY is unset", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(["🟢", "🟡", "🔴"]).toContain(body.signal);
    expect(body.fallback).toBe(true);
    expect(["go", "fix", "stop"]).toContain(body.badge);
  });

  it("uses LLM result when API key set", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.signal).toBe("🟢");
    expect(body.badge).toBe("go");
    expect(body.fallback).toBe(false);
  });
});

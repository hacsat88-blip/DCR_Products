import { beforeEach, describe, expect, it, vi } from "vitest";

const createJQuantsClientMock = vi.fn();
const getListedInfoMock = vi.fn();
const fetchPriceSeriesMock = vi.fn();
const analyzeStockMock = vi.fn();

vi.mock("@/lib/providers/jquants", () => ({
  createJQuantsClient: (...args: unknown[]) => createJQuantsClientMock(...args),
}));

vi.mock("@/lib/services/prices", () => ({
  fetchPriceSeries: (...args: unknown[]) => fetchPriceSeriesMock(...args),
}));

vi.mock("@/lib/llm/router", () => ({
  analyzeStock: (...args: unknown[]) => analyzeStockMock(...args),
}));

describe("/api/research route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getListedInfoMock.mockResolvedValue([
      { Code: "72030", CompanyName: "トヨタ自動車", CompanyNameEnglish: "Toyota" },
    ]);
    createJQuantsClientMock.mockReturnValue({
      getListedInfo: getListedInfoMock,
    });
    fetchPriceSeriesMock.mockResolvedValue({
      candles: [{ c: 100 }, { c: 110 }],
    });
    analyzeStockMock.mockResolvedValue({
      code: "7203",
      name: "トヨタ自動車",
      scores: { a: 80, b: 70, c: 75, d: 78, e: 74 },
      totalScore: 76,
      scenarios: {
        short: { up: "+5%推定", mid: "+1%推定", down: "-4%推定", confidence: "mid", evidence: "B" },
        mid: { up: "+10%推定", mid: "+3%推定", down: "-8%推定", confidence: "mid", evidence: "B" },
        long: { up: "+20%推定", mid: "+8%推定", down: "-12%推定", confidence: "mid", evidence: "B" },
      },
      risks: ["risk"],
      catalysts: ["catalyst"],
      unknowns: [],
    });
  });

  it("reuses the same J-Quants client across JP research requests", async () => {
    const { POST } = await import("@/app/api/research/route");

    await POST(
      new Request("http://localhost/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "7203", market: "JP" }),
      }),
    );
    await POST(
      new Request("http://localhost/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "7203", market: "JP" }),
      }),
    );

    expect(createJQuantsClientMock).toHaveBeenCalledTimes(1);
  });
});

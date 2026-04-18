import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/services/marketIndices", () => ({
  getAllIndices: vi.fn(async () => [
    {
      id: "SPX",
      label: "S&P 500",
      symbol: "^GSPC",
      source: "alphaVantage",
      currency: "USD",
      status: "ok",
      data: [
        { date: "2025-01-01", open: 100, high: 101, low: 99, close: 100, volume: 0 },
        { date: "2025-01-02", open: 100, high: 102, low: 99.5, close: 101, volume: 0 },
      ],
      latest: { date: "2025-01-02", close: 101, change: 1, changePercent: 1 },
      range: "daily",
    },
  ]),
}));

import { GET } from "@/app/api/indices/route";

describe("/api/indices route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 with items", async () => {
    const req = new Request("http://localhost/api/indices?range=daily");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.range).toBe("daily");
    expect(body.items[0].id).toBe("SPX");
  });

  it("defaults range to daily when invalid", async () => {
    const req = new Request("http://localhost/api/indices?range=garbage");
    const res = await GET(req);
    const body = await res.json();
    expect(body.range).toBe("daily");
  });

  it("accepts weekly", async () => {
    const req = new Request("http://localhost/api/indices?range=weekly");
    const res = await GET(req);
    const body = await res.json();
    expect(body.range).toBe("weekly");
  });
});

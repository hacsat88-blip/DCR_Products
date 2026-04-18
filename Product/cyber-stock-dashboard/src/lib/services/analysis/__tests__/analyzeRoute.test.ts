import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/client", () => ({
  getDb: vi.fn(() => ({}) as never),
}));
vi.mock("@/lib/providers/jquants", () => ({
  createJQuantsClient: vi.fn(() => ({})),
}));
vi.mock("@/lib/providers/alphaVantage", () => ({
  createAlphaVantageClient: vi.fn(() => ({})),
}));
vi.mock("@/lib/services/analysis/screener", async (orig) => {
  const actual =
    (await orig()) as typeof import("@/lib/services/analysis/screener");
  return {
    ...actual,
    screenCandidates: vi.fn(async () => ({
      analyses: [],
      candidates: [],
      cacheHits: 0,
      cacheMisses: 0,
      warnings: [],
    })),
  };
});

vi.mock("@/lib/llm/router", () => ({
  extractIntent: vi.fn(async () => ({
    market: "JP",
    priceRangeMin: 100,
    priceRangeMax: 1000,
    currency: "JPY",
    theme: null,
    style: "総合",
    riskTolerance: "mid",
  })),
}));

describe("/api/analyze route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "returns 400 on invalid body",
    async () => {
      const { POST } = await import("@/app/api/analyze/route");
      const req = new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ market: "JP", priceMin: -1, priceMax: 1000 }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = (await res.json()) as { disclaimer: string };
      expect(body.disclaimer).toBeTruthy();
    },
    20000,
  );

  it(
    "returns 200 with disclaimer on valid body",
    async () => {
      const { POST } = await import("@/app/api/analyze/route");
      const req = new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ market: "JP", priceMin: 100, priceMax: 5000 }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: unknown;
        disclaimer: string;
      };
      expect(body.disclaimer).toBeTruthy();
      expect(body.data).toBeDefined();
    },
    20000,
  );
});

describe("/api/analyze/intent route", () => {
  it(
    "returns 400 on empty text",
    async () => {
      const { POST } = await import("@/app/api/analyze/intent/route");
      const req = new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ text: "" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    },
    20000,
  );

  it(
    "returns intent on valid text",
    async () => {
      const { POST } = await import("@/app/api/analyze/intent/route");
      const req = new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ text: "1000円台の高配当株" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { market: string };
        disclaimer: string;
      };
      expect(body.data.market).toBe("JP");
      expect(body.disclaimer).toBeTruthy();
    },
    20000,
  );
});

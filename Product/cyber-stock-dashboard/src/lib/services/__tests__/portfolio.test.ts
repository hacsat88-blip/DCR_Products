import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTestDb } from "@/lib/db/__tests__/helper";
import {
  PortfolioInputSchema,
  __resetFxCacheForTests,
  addOrUpdatePosition,
  listPortfolioWithValuation,
  removePosition,
  snapshotDailyValuation,
} from "@/lib/services/portfolio";
import type { JQuantsClient } from "@/lib/providers/jquants";
import type { AlphaVantageClient } from "@/lib/providers/alphaVantage";
import { portfolioSnapshot } from "@/lib/db/schema";
import { buildPortfolioChatContext } from "@/lib/portfolioChatContext";

function makeJq(closes: Record<string, number>): JQuantsClient {
  return {
    getIdToken: vi.fn(),
    getListedInfo: vi.fn(),
    getDailyQuotes: vi.fn(async (code: string) => {
      const close = closes[code];
      if (close == null) return [];
      return [
        {
          date: "2024-05-01",
          open: close,
          high: close,
          low: close,
          close,
          volume: 1,
        },
      ];
    }),
  } as unknown as JQuantsClient;
}

interface MockAv extends AlphaVantageClient {
  fxCalls: () => number;
}

function makeAv(prices: Record<string, number>, fx = 150): MockAv {
  let fxCalls = 0;
  const av: MockAv = {
    getDailyAdjusted: vi.fn(),
    getQuote: vi.fn(async (s: string) => ({
      symbol: s,
      price: prices[s] ?? 0,
      currency: "USD" as const,
      timestamp: "2024-05-01",
    })),
    getFxRate: vi.fn(async () => {
      fxCalls += 1;
      return fx;
    }),
    fxCalls: () => fxCalls,
  };
  return av;
}

const NOW = new Date("2024-05-01T00:00:00Z").getTime();
const now = () => NOW;

beforeEach(() => {
  __resetFxCacheForTests();
});

describe("PortfolioInputSchema", () => {
  it("validates and rejects bad input", () => {
    expect(() =>
      PortfolioInputSchema.parse({
        code: "7203",
        market: "JP",
        name: "Toyota",
        quantity: 100,
        avgCost: 2500,
        currency: "JPY",
      }),
    ).not.toThrow();
    expect(() =>
      PortfolioInputSchema.parse({
        code: "",
        market: "JP",
        name: "x",
        quantity: -1,
        avgCost: 0,
        currency: "JPY",
      }),
    ).toThrow();
  });
});

describe("addOrUpdatePosition / removePosition", () => {
  it("adds, updates and removes positions", () => {
    const db = createTestDb() as never;
    const inserted = addOrUpdatePosition(
      {
        code: "7203",
        market: "JP",
        name: "Toyota",
        quantity: 100,
        avgCost: 2500,
        currency: "JPY",
      },
      { db },
    );
    expect(inserted.id).toBeGreaterThan(0);

    const updated = addOrUpdatePosition(
      {
        id: inserted.id,
        code: "7203",
        market: "JP",
        name: "Toyota Motor",
        quantity: 200,
        avgCost: 2400,
        currency: "JPY",
      },
      { db },
    );
    expect(updated.name).toBe("Toyota Motor");
    expect(updated.quantity).toBe(200);

    removePosition(inserted.id, { db });
  });
});

describe("listPortfolioWithValuation", () => {
  it("computes valuation for JP and US holdings with FX", async () => {
    const db = createTestDb() as never;
    addOrUpdatePosition(
      {
        code: "7203",
        market: "JP",
        name: "Toyota",
        quantity: 100,
        avgCost: 2500,
        currency: "JPY",
      },
      { db },
    );
    addOrUpdatePosition(
      {
        code: "AAPL",
        market: "US",
        name: "Apple",
        quantity: 10,
        avgCost: 180,
        currency: "USD",
      },
      { db },
    );

    const jq = makeJq({ "7203": 3000 });
    const av = makeAv({ AAPL: 200 }, 150);
    const result = await listPortfolioWithValuation({ db, jquants: jq, alpha: av, now });

    expect(result).toHaveLength(2);
    const jp = result.find((r) => r.code === "7203")!;
    const us = result.find((r) => r.code === "AAPL")!;

    expect(jp.currentPrice).toBe(3000);
    expect(jp.marketValueJpy).toBe(300_000);
    expect(jp.costJpy).toBe(250_000);
    expect(jp.pnlJpy).toBe(50_000);

    expect(us.currentPrice).toBe(200);
    expect(us.fxRate).toBe(150);
    expect(us.marketValueJpy).toBe(10 * 200 * 150);
    expect(us.costJpy).toBe(10 * 180 * 150);
    expect(us.pnlJpy).toBe((200 - 180) * 10 * 150);

    const totalValue = jp.marketValueJpy + us.marketValueJpy;
    expect(jp.weightPercent + us.weightPercent).toBeCloseTo(100, 5);
    expect(jp.weightPercent).toBeCloseTo((300_000 / totalValue) * 100, 5);
  });

  it("returns empty array when no holdings", async () => {
    const db = createTestDb() as never;
    const result = await listPortfolioWithValuation({
      db,
      jquants: makeJq({}),
      alpha: makeAv({}),
      now,
    });
    expect(result).toEqual([]);
  });

  it("captures price errors per row without failing whole call", async () => {
    const db = createTestDb() as never;
    addOrUpdatePosition(
      {
        code: "9999",
        market: "JP",
        name: "Bad",
        quantity: 10,
        avgCost: 100,
        currency: "JPY",
      },
      { db },
    );
    const jq: JQuantsClient = {
      getIdToken: vi.fn(),
      getListedInfo: vi.fn(),
      getDailyQuotes: vi.fn(async () => {
        throw new Error("boom");
      }),
    } as unknown as JQuantsClient;
    const result = await listPortfolioWithValuation({
      db,
      jquants: jq,
      alpha: makeAv({}),
      now,
    });
    expect(result[0].currentPrice).toBeNull();
    expect(result[0].priceError).toBe("boom");
  });
});

describe("buildPortfolioChatContext", () => {
  it("summarizes holdings, weights, pnl, and concentration risk", () => {
    const summary = buildPortfolioChatContext([
      {
        code: "7203",
        currentPrice: 3000,
        marketValueJpy: 300_000,
        costJpy: 250_000,
        pnlJpy: 50_000,
        weightPercent: 60,
      },
      {
        code: "AAPL",
        currentPrice: 200,
        marketValueJpy: 200_000,
        costJpy: 180_000,
        pnlJpy: 20_000,
        weightPercent: 40,
      },
    ]);

    expect(summary).toContain("2銘柄");
    expect(summary).toContain("7203 60.0%");
    expect(summary).toContain("AAPL 40.0%");
    expect(summary).toContain("評価損益 +70,000円");
    expect(summary).toContain("集中");
  });

  it("returns explicit no-holdings guidance when portfolio is empty", () => {
    expect(buildPortfolioChatContext([])).toContain(
      "保有銘柄は未登録",
    );
  });
});

describe("FX cache hit/miss", () => {
  it("hits memory cache within TTL and refreshes after expiry", async () => {
    const db = createTestDb() as never;
    addOrUpdatePosition(
      {
        code: "AAPL",
        market: "US",
        name: "Apple",
        quantity: 1,
        avgCost: 100,
        currency: "USD",
      },
      { db },
    );
    const av = makeAv({ AAPL: 100 }, 150);
    let t = NOW;
    const tnow = () => t;
    const ttl = 5 * 60 * 1000;

    await listPortfolioWithValuation({
      db,
      jquants: makeJq({}),
      alpha: av,
      now: tnow,
      fxCacheTtlMs: ttl,
    });
    await listPortfolioWithValuation({
      db,
      jquants: makeJq({}),
      alpha: av,
      now: tnow,
      fxCacheTtlMs: ttl,
    });
    expect(av.fxCalls()).toBe(1);

    t += ttl + 1;
    await listPortfolioWithValuation({
      db,
      jquants: makeJq({}),
      alpha: av,
      now: tnow,
      fxCacheTtlMs: ttl,
    });
    expect(av.fxCalls()).toBe(2);
  });
});

describe("snapshotDailyValuation", () => {
  it("inserts then updates same-day snapshot (idempotent)", async () => {
    const db = createTestDb() as never;
    addOrUpdatePosition(
      {
        code: "7203",
        market: "JP",
        name: "Toyota",
        quantity: 100,
        avgCost: 2500,
        currency: "JPY",
      },
      { db },
    );
    const jq = makeJq({ "7203": 3000 });
    const av = makeAv({});
    const first = await snapshotDailyValuation({ db, jquants: jq, alpha: av, now });
    expect(first.inserted).toBe(true);
    expect(first.totalValueJpy).toBe(300_000);

    const jq2 = makeJq({ "7203": 2800 });
    const second = await snapshotDailyValuation({
      db,
      jquants: jq2,
      alpha: av,
      now,
    });
    expect(second.inserted).toBe(false);
    expect(second.totalValueJpy).toBe(280_000);

    const all = (db as unknown as {
      select: () => {
        from: (t: typeof portfolioSnapshot) => { all: () => unknown[] };
      };
    })
      .select()
      .from(portfolioSnapshot)
      .all();
    expect(all).toHaveLength(1);
  });
});

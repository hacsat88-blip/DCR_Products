import { describe, expect, it } from "vitest";

import { mergeStock } from "@/lib/mergeStock";
import type { Fundamentals, Quote } from "@/services/providers/types";
import type { Stock } from "@/types/stock";

function makeStock(overrides: Partial<Stock> = {}): Stock {
  return {
    id: "mock-1111",
    code: "1111",
    name: "Mock 1111",
    sector: "Mock Sector",
    themeTags: [],
    price: 1000,
    changePercent: 0.5,
    marketCap: 1_000_000_000,
    per: 12,
    pbr: 1.2,
    dividendYield: 1.1,
    revenueGrowth: 5,
    opGrowth: 3,
    operatingCF: 300,
    oneLiner: "mock",
    summary: "mock summary",
    coreKpiLabel: "kpi",
    coreKpiValue: "1",
    riskSignal: "risk",
    collapseCondition: "collapse",
    priceUpdatedAt: "2024-01-01T00:00:00.000Z",
    priceSourceLabel: "M",
    fundamentalsUpdatedAt: "2024-01-01T00:00:00.000Z",
    fundamentalsSubmitDate: "2024-01-01T00:00:00.000Z",
    fundamentalsSourceLabel: "M",
    chartData: [],
    ...overrides
  };
}

function makeQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    code: "1111",
    name: "Live 1111",
    price: 2000,
    changePercent: 1.8,
    sourceTimestamp: "2024-02-01T00:00:00.000Z",
    sourceLabel: "YF",
    sector: "Live Sector",
    marketCap: 2_000_000_000,
    per: 20,
    pbr: 2.5,
    dividendYield: 2.2,
    ...overrides
  };
}

function makeFundamentals(overrides: Partial<Fundamentals> = {}): Fundamentals {
  return {
    code: "1111",
    revenueGrowth: 18,
    opGrowth: 11,
    operatingCF: 900,
    sourceTimestamp: "2024-02-02T00:00:00.000Z",
    sourceLabel: "C",
    sector: "Fundamental Sector",
    marketCap: 2_100_000_000,
    per: 21,
    pbr: 2.8,
    dividendYield: 2.4,
    ...overrides
  };
}

describe("mergeStock", () => {
  it("overlays all stock fields when valid live payload is present", () => {
    const merged = mergeStock(makeStock(), makeQuote(), makeFundamentals());

    expect(merged.name).toBe("Live 1111");
    expect(merged.price).toBe(2000);
    expect(merged.changePercent).toBe(1.8);
    expect(merged.sector).toBe("Live Sector");
    expect(merged.marketCap).toBe(2_000_000_000);
    expect(merged.per).toBe(20);
    expect(merged.pbr).toBe(2.5);
    expect(merged.dividendYield).toBe(2.2);
    expect(merged.revenueGrowth).toBe(18);
    expect(merged.opGrowth).toBe(11);
    expect(merged.operatingCF).toBe(900);
    expect(merged.priceUpdatedAt).toBe("2024-02-01T00:00:00.000Z");
    expect(merged.priceSourceLabel).toBe("YF");
    expect(merged.fundamentalsUpdatedAt).toBe("2024-02-02T00:00:00.000Z");
    expect(merged.fundamentalsSubmitDate).toBe("2024-02-02T00:00:00.000Z");
    expect(merged.fundamentalsSourceLabel).toBe("C");
  });

  it("preserves fallback fields when only partial live payload is present", () => {
    const merged = mergeStock(
      makeStock(),
      makeQuote({
        name: null,
        changePercent: null,
        sector: null,
        marketCap: null,
        per: null,
        pbr: null,
        dividendYield: null,
        sourceTimestamp: null,
        sourceLabel: null
      }),
      makeFundamentals({
        revenueGrowth: null,
        opGrowth: 9,
        operatingCF: null,
        sector: null,
        marketCap: null,
        per: null,
        pbr: null,
        dividendYield: null,
        sourceTimestamp: null
      })
    );

    expect(merged.name).toBe("Mock 1111");
    expect(merged.price).toBe(2000);
    expect(merged.changePercent).toBe(0.5);
    expect(merged.sector).toBe("Mock Sector");
    expect(merged.marketCap).toBe(1_000_000_000);
    expect(merged.per).toBe(12);
    expect(merged.pbr).toBe(1.2);
    expect(merged.dividendYield).toBe(1.1);
    expect(merged.revenueGrowth).toBe(5);
    expect(merged.opGrowth).toBe(9);
    expect(merged.operatingCF).toBe(300);
    expect(merged.priceUpdatedAt).toBe("2024-01-01T00:00:00.000Z");
    expect(merged.priceSourceLabel).toBe("M");
    expect(merged.fundamentalsSourceLabel).toBe("C");
  });

  it("keeps valid defaults when live values are invalid", () => {
    const merged = mergeStock(
      makeStock({
        priceSourceLabel: "AV",
        fundamentalsSourceLabel: "M",
        priceUpdatedAt: "2024-01-05T00:00:00.000Z",
        fundamentalsUpdatedAt: "2024-01-06T00:00:00.000Z",
        fundamentalsSubmitDate: "2024-01-06T00:00:00.000Z"
      }),
      makeQuote({
        name: "   ",
        price: Number.NaN,
        changePercent: Number.POSITIVE_INFINITY,
        sector: "",
        marketCap: Number.NaN,
        per: Number.NaN,
        pbr: Number.NaN,
        dividendYield: Number.NaN,
        sourceTimestamp: "not-a-date",
        sourceLabel: "INVALID" as unknown as Quote["sourceLabel"]
      }),
      makeFundamentals({
        revenueGrowth: Number.NaN,
        opGrowth: Number.NaN,
        operatingCF: Number.NaN,
        sector: "  ",
        marketCap: Number.NaN,
        per: Number.NaN,
        pbr: Number.NaN,
        dividendYield: Number.NaN,
        sourceTimestamp: "not-a-date"
      })
    );

    expect(merged.name).toBe("Mock 1111");
    expect(merged.price).toBe(1000);
    expect(merged.changePercent).toBe(0.5);
    expect(merged.sector).toBe("Mock Sector");
    expect(merged.marketCap).toBe(1_000_000_000);
    expect(merged.per).toBe(12);
    expect(merged.pbr).toBe(1.2);
    expect(merged.dividendYield).toBe(1.1);
    expect(merged.revenueGrowth).toBe(5);
    expect(merged.opGrowth).toBe(3);
    expect(merged.operatingCF).toBe(300);
    expect(merged.priceUpdatedAt).toBe("2024-01-05T00:00:00.000Z");
    expect(merged.priceSourceLabel).toBe("AV");
    expect(merged.fundamentalsUpdatedAt).toBe("2024-01-06T00:00:00.000Z");
    expect(merged.fundamentalsSubmitDate).toBe("2024-01-06T00:00:00.000Z");
    expect(merged.fundamentalsSourceLabel).toBe("M");
  });

  it("keeps existing Japanese name for 4-digit JP code even when quote name is English", () => {
    const merged = mergeStock(
      makeStock({
        code: "9432",
        name: "日本電信電話"
      }),
      makeQuote({
        code: "9432",
        name: "Nippon Telegraph and Telephone Corp."
      }),
      makeFundamentals({ code: "9432" })
    );

    expect(merged.name).toBe("日本電信電話");
  });

  it("uses quote name for 4-digit JP code when existing name is a placeholder", () => {
    const merged = mergeStock(
      makeStock({
        code: "9432",
        name: "銘柄 9432"
      }),
      makeQuote({
        code: "9432",
        name: "Nippon Telegraph and Telephone Corp."
      }),
      makeFundamentals({ code: "9432" })
    );

    expect(merged.name).toBe("Nippon Telegraph and Telephone Corp.");
  });

  it("treats normalized placeholder variants as placeholders for 4-digit JP codes", () => {
    const merged = mergeStock(
      makeStock({
        code: "9432",
        name: "   MOCK   9432  "
      }),
      makeQuote({
        code: "9432",
        name: "Nippon Telegraph and Telephone Corp."
      }),
      makeFundamentals({ code: "9432" })
    );

    expect(merged.name).toBe("Nippon Telegraph and Telephone Corp.");
  });

  it("keeps existing Japanese name for 4-digit JP code when quote name is blank", () => {
    const merged = mergeStock(
      makeStock({
        code: "9432",
        name: "日本電信電話"
      }),
      makeQuote({
        code: "9432",
        name: "   "
      }),
      makeFundamentals({ code: "9432" })
    );

    expect(merged.name).toBe("日本電信電話");
  });

  it("keeps original quote-priority behavior for non-4-digit symbols", () => {
    const merged = mergeStock(
      makeStock({
        code: "AAPL",
        name: "アップル"
      }),
      makeQuote({
        code: "AAPL",
        name: "Apple Inc."
      }),
      makeFundamentals({ code: "AAPL" })
    );

    expect(merged.name).toBe("Apple Inc.");
  });
});

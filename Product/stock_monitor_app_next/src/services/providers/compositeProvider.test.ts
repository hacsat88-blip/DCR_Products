import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Fundamentals, Quote } from "./types";

const providerMocks = vi.hoisted(() => ({
  getMockStocks: vi.fn(),
  getYahooQuotes: vi.fn(),
  getAlphaQuotes: vi.fn(),
  getFundamentals: vi.fn()
}));

vi.mock("./mockProvider", () => ({
  MockProvider: class {
    getStocks = providerMocks.getMockStocks;
  }
}));

vi.mock("./yahooFinancePriceProvider", () => ({
  YahooFinancePriceProvider: class {
    getQuotes = providerMocks.getYahooQuotes;
  }
}));

vi.mock("./alphaVantagePriceProvider", () => ({
  AlphaVantagePriceProvider: class {
    getQuotes = providerMocks.getAlphaQuotes;
  }
}));

vi.mock("./edinetDbProvider", () => ({
  EdinetDbProvider: class {
    getFundamentals = providerMocks.getFundamentals;
  }
}));

import { CompositeProvider } from "./compositeProvider";

const ORIGINAL_DATA_MODE = process.env.DATA_MODE;
const ORIGINAL_ENABLE_LIVE_DATA = process.env.ENABLE_LIVE_DATA;
const ORIGINAL_ALPHA_KEY = process.env.ALPHA_VANTAGE_API_KEY;

function makeMockStock(code: string) {
  return {
    id: `mock-${code}`,
    code,
    name: `Mock ${code}`,
    sector: "Mock",
    themeTags: [],
    price: 1000,
    changePercent: 0,
    marketCap: 1_000_000_000,
    per: null,
    pbr: null,
    dividendYield: null,
    revenueGrowth: null,
    opGrowth: null,
    operatingCF: null,
    oneLiner: "mock",
    summary: "mock",
    coreKpiLabel: "kpi",
    coreKpiValue: "1",
    riskSignal: "risk",
    collapseCondition: "collapse",
    chartData: []
  };
}

function makeFundamental(code: string): Fundamentals {
  return {
    code,
    revenueGrowth: 10,
    opGrowth: 5,
    operatingCF: 100,
    sourceTimestamp: "2024-01-02T00:00:00Z",
    sourceLabel: "C",
    sector: "Tech",
    marketCap: 1_500_000_000,
    per: 15,
    pbr: 2,
    dividendYield: 1
  };
}

function makeYahooQuote(code: string): Quote {
  return {
    code,
    name: `Yahoo ${code}`,
    price: 2000,
    changePercent: 1.2,
    sourceTimestamp: "2024-01-03T00:00:00Z",
    sourceLabel: "YF"
  };
}

function makeAlphaQuote(code: string): Quote {
  return {
    code,
    name: `Alpha ${code}`,
    price: 2100,
    changePercent: 1.5,
    sourceTimestamp: "2024-01-04T00:00:00Z",
    sourceLabel: "AV"
  };
}

describe("CompositeProvider fallback sequence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATA_MODE = "live";
    process.env.ENABLE_LIVE_DATA = "true";
  });

  afterEach(() => {
    if (ORIGINAL_DATA_MODE == null) {
      delete process.env.DATA_MODE;
    } else {
      process.env.DATA_MODE = ORIGINAL_DATA_MODE;
    }
    if (ORIGINAL_ENABLE_LIVE_DATA == null) {
      delete process.env.ENABLE_LIVE_DATA;
    } else {
      process.env.ENABLE_LIVE_DATA = ORIGINAL_ENABLE_LIVE_DATA;
    }
    if (ORIGINAL_ALPHA_KEY == null) {
      delete process.env.ALPHA_VANTAGE_API_KEY;
    } else {
      process.env.ALPHA_VANTAGE_API_KEY = ORIGINAL_ALPHA_KEY;
    }
  });

  it("uses Alpha Vantage only for symbols missing from Yahoo", async () => {
    process.env.ALPHA_VANTAGE_API_KEY = "test-key";
    providerMocks.getMockStocks.mockResolvedValueOnce([makeMockStock("1111"), makeMockStock("2222")]);
    providerMocks.getYahooQuotes.mockResolvedValueOnce([makeYahooQuote("1111")]);
    providerMocks.getAlphaQuotes.mockResolvedValueOnce([makeAlphaQuote("2222")]);
    providerMocks.getFundamentals.mockResolvedValueOnce([makeFundamental("1111"), makeFundamental("2222")]);

    const provider = new CompositeProvider();
    const result = await provider.load(["1111", "2222"]);

    expect(result.dataMode).toBe("live");
    expect(result.sourceLabel).toBe("C");
    expect(result.sourceMeta).toEqual({ overall: "C", price: "C", fundamentals: "C" });
    expect(result.error).toBeNull();
    expect(result.health.find((h) => h.provider === "yahoo")?.ok).toBe(true);
    expect(result.health.find((h) => h.provider === "alphaVantage")?.ok).toBe(true);
    expect(providerMocks.getAlphaQuotes).toHaveBeenCalledWith(["2222"]);
    expect(result.stocks.find((s) => s.code === "1111")?.priceSourceLabel).toBe("YF");
    expect(result.stocks.find((s) => s.code === "2222")?.priceSourceLabel).toBe("AV");
  });

  it("degrades safely when Alpha Vantage key is missing", async () => {
    delete process.env.ALPHA_VANTAGE_API_KEY;
    providerMocks.getMockStocks.mockResolvedValueOnce([makeMockStock("1111"), makeMockStock("2222")]);
    providerMocks.getYahooQuotes.mockResolvedValueOnce([makeYahooQuote("1111")]);
    providerMocks.getAlphaQuotes.mockRejectedValueOnce(
      new Error("Alpha Vantage API key missing. Set ALPHA_VANTAGE_API_KEY in server env and restart the dev server.")
    );
    providerMocks.getFundamentals.mockResolvedValueOnce([makeFundamental("1111"), makeFundamental("2222")]);

    const provider = new CompositeProvider();
    const result = await provider.load(["1111", "2222"]);

    expect(result.dataMode).toBe("fallback");
    expect(result.error).toContain("Alpha Vantage");
    expect(result.sourceMeta).toEqual({ overall: "YF", price: "C", fundamentals: "C" });
    expect(result.health.find((h) => h.provider === "alphaVantage")?.errorCode).toBe("auth_failure");
    expect(result.fallbackReason).toContain("価格必須項目");
    expect(result.stocks.find((s) => s.code === "2222")?.priceSourceLabel).toBe("M");
  });

  it("enriches fallback stock narratives from quote and fundamentals", async () => {
    providerMocks.getMockStocks.mockResolvedValueOnce([makeMockStock("1111")]);
    providerMocks.getYahooQuotes.mockResolvedValueOnce([
      makeYahooQuote("1111"),
      {
        code: "9999",
        name: "Growth 9999",
        price: 1234,
        changePercent: 3.6,
        sourceTimestamp: "2024-01-05T00:00:00Z",
        sourceLabel: "YF",
        sector: "SaaS",
        per: 45,
        pbr: 4.8,
        dividendYield: 0.4
      }
    ]);
    providerMocks.getAlphaQuotes.mockResolvedValueOnce([]);
    providerMocks.getFundamentals.mockResolvedValueOnce([
      makeFundamental("1111"),
      {
        code: "9999",
        revenueGrowth: 12.3,
        opGrowth: 6.1,
        operatingCF: 4567,
        sourceTimestamp: "2024-01-05T00:00:00Z",
        sourceLabel: "C",
        sector: "SaaS",
        marketCap: 2_000_000_000,
        per: 45,
        pbr: 4.8,
        dividendYield: 0.4
      }
    ]);

    const provider = new CompositeProvider();
    const result = await provider.load(["1111", "9999"]);
    const addedStock = result.stocks.find((stock) => stock.code === "9999");

    expect(addedStock).toBeDefined();
    expect(addedStock?.oneLiner).toContain("SaaSセクター");
    expect(addedStock?.oneLiner).toContain("+3.6%");
    expect(addedStock?.summary).toContain("PER 45倍");
    expect(addedStock?.summary).toContain("売上成長率 +12.3%");
    expect(addedStock?.coreKpiLabel).toBe("売上成長率");
    expect(addedStock?.coreKpiValue).toBe("+12.3%");
    expect(addedStock?.riskSignal).not.toContain("API検索から追加された銘柄です。");
    expect(addedStock?.riskSignal).toContain("PERが高く");
    expect(addedStock?.collapseCondition).toContain("営業CF");
  });

  it("keeps informative defaults for fallback stocks when data is sparse", async () => {
    providerMocks.getMockStocks.mockResolvedValueOnce([makeMockStock("1111")]);
    providerMocks.getYahooQuotes.mockResolvedValueOnce([
      makeYahooQuote("1111"),
      {
        code: "8888",
        name: null,
        price: 410,
        changePercent: null,
        sourceTimestamp: "2024-01-05T00:00:00Z",
        sourceLabel: "YF"
      }
    ]);
    providerMocks.getAlphaQuotes.mockResolvedValueOnce([]);
    providerMocks.getFundamentals.mockResolvedValueOnce([
      makeFundamental("1111"),
      {
        code: "8888",
        revenueGrowth: null,
        opGrowth: null,
        operatingCF: null,
        sourceTimestamp: "2024-01-05T00:00:00Z",
        sourceLabel: "C",
        sector: null,
        marketCap: null,
        per: null,
        pbr: null,
        dividendYield: null
      }
    ]);

    const provider = new CompositeProvider();
    const result = await provider.load(["1111", "8888"]);
    const addedStock = result.stocks.find((stock) => stock.code === "8888");

    expect(addedStock).toBeDefined();
    expect(addedStock?.oneLiner).toContain("未分類セクター");
    expect(addedStock?.oneLiner).not.toContain("API検索から追加された銘柄です。");
    expect(addedStock?.summary).toContain("取得待ち");
    expect(addedStock?.coreKpiLabel).toBe("確認優先指標");
    expect(addedStock?.coreKpiValue).toBe("財務更新待ち");
    expect(addedStock?.riskSignal).toContain("次回決算");
    expect(addedStock?.collapseCondition).toContain("確認できない");
  });

  it("builds enriched fallback details for API-added stocks even without fundamentals rows", async () => {
    providerMocks.getMockStocks.mockResolvedValueOnce([makeMockStock("1111")]);
    providerMocks.getYahooQuotes.mockResolvedValueOnce([
      makeYahooQuote("1111"),
      {
        code: "7777",
        name: "Momentum 7777",
        price: 1500,
        changePercent: 6.2,
        sourceTimestamp: "2024-01-05T00:00:00Z",
        sourceLabel: "YF",
        sector: "半導体",
        per: null,
        pbr: 5.1,
        dividendYield: null
      }
    ]);
    providerMocks.getAlphaQuotes.mockResolvedValueOnce([]);
    providerMocks.getFundamentals.mockResolvedValueOnce([makeFundamental("1111")]);

    const provider = new CompositeProvider();
    const result = await provider.load(["1111", "7777"]);
    const addedStock = result.stocks.find((stock) => stock.code === "7777");

    expect(addedStock).toBeDefined();
    expect(addedStock?.oneLiner).toContain("+6.2%");
    expect(addedStock?.summary).toContain("半導体の追加監視銘柄です。");
    expect(addedStock?.summary).toContain("PBR 5.1倍");
    expect(addedStock?.summary).toContain("成長率と営業CFは次回の開示更新を確認してください。");
    expect(addedStock?.coreKpiLabel).toBe("PBR");
    expect(addedStock?.coreKpiValue).toBe("5.1倍");
    expect(addedStock?.riskSignal).toContain("PBRが高め");
    expect(addedStock?.riskSignal).toContain("成長率または営業CFが欠けている");
    expect(addedStock?.collapseCondition).toContain("両方が確認できない");
  });
});

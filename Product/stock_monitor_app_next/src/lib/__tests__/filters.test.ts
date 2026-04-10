import { beforeEach, describe, it, expect } from "vitest";
import { filterStocks, sortStocks, DEFAULT_FILTERS } from "@/lib/filters";
import { restoreSavedScreenState, useStockStore } from "@/store/useStockStore";
import type { SavedScreen } from "@/types/archive";
import type { EvaluatedStock, StockFilters } from "@/types/stock";

function makeEvaluatedStock(overrides: Partial<EvaluatedStock> = {}): EvaluatedStock {
  return {
    id: "test-1",
    code: "9424",
    name: "日本通信",
    sector: "IT",
    themeTags: ["通信"],
    price: 300,
    changePercent: 2.0,
    marketCap: 30_000_000_000,
    per: 20,
    pbr: 2.0,
    dividendYield: 1.5,
    revenueGrowth: 20,
    opGrowth: 18,
    operatingCF: 500,
    oneLiner: "MVNO大手",
    summary: "テストサマリー",
    coreKpiLabel: "売上成長率",
    coreKpiValue: "20%",
    riskSignal: "",
    collapseCondition: "",
    chartData: [],
    score: 75,
    evaluatedAction: "buy_now",
    breakdown: [],
    scoreSummary: "",
    actionReason: "",
    riskFlags: [],
    ...overrides,
  };
}

const STOCKS: EvaluatedStock[] = [
  makeEvaluatedStock({
    id: "1",
    code: "9424",
    name: "日本通信",
    sector: "IT",
    price: 300,
    marketCap: 30_000_000_000,
    per: 20,
    pbr: 2.0,
    dividendYield: 1.5,
    revenueGrowth: 20,
    opGrowth: 18,
    operatingCF: 500,
    score: 80,
    evaluatedAction: "buy_now",
    watched: true,
  }),
  makeEvaluatedStock({
    id: "2",
    code: "2337",
    name: "いちご",
    sector: "不動産",
    price: 400,
    marketCap: 100_000_000_000,
    per: 15,
    pbr: 1.0,
    dividendYield: 3.0,
    revenueGrowth: 10,
    opGrowth: 8,
    operatingCF: 1000,
    score: 65,
    evaluatedAction: "wait_earnings",
    watched: false,
  }),
  makeEvaluatedStock({
    id: "3",
    code: "4477",
    name: "BASE",
    sector: "IT",
    price: 200,
    marketCap: 20_000_000_000,
    per: 50,
    pbr: 5.0,
    dividendYield: 0,
    revenueGrowth: 30,
    opGrowth: 35,
    operatingCF: -200,
    score: 55,
    evaluatedAction: "wait_pullback",
    watched: true,
  }),
  makeEvaluatedStock({
    id: "4",
    code: "4419",
    name: "Finatext HD",
    sector: "IT",
    price: 1500,
    marketCap: 500_000_000_000,
    per: null,
    pbr: null,
    dividendYield: null,
    revenueGrowth: null,
    opGrowth: null,
    operatingCF: null,
    score: 50,
    evaluatedAction: "exclude",
    watched: false,
  }),
];

describe("filterStocks", () => {
  it("returns all stocks with default filters", () => {
    const result = filterStocks(STOCKS, DEFAULT_FILTERS);
    expect(result).toHaveLength(4);
  });

  describe("text query filter", () => {
    it("filters by stock name", () => {
      const filters: StockFilters = { ...DEFAULT_FILTERS, query: "日本通信" };
      const result = filterStocks(STOCKS, filters);
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe("9424");
    });

    it("filters by stock code", () => {
      const filters: StockFilters = { ...DEFAULT_FILTERS, query: "4477" };
      const result = filterStocks(STOCKS, filters);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("BASE");
    });

    it("filters by theme tags content", () => {
      const filters: StockFilters = { ...DEFAULT_FILTERS, query: "通信" };
      const result = filterStocks(STOCKS, filters);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some((s) => s.code === "9424")).toBe(true);
    });

    it("is case-insensitive", () => {
      const filters: StockFilters = { ...DEFAULT_FILTERS, query: "base" };
      const result = filterStocks(STOCKS, filters);
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe("4477");
    });
  });

  describe("price filter", () => {
    it("filters by minimum price", () => {
      const filters: StockFilters = { ...DEFAULT_FILTERS, priceMin: 350 };
      const result = filterStocks(STOCKS, filters);
      expect(result.every((s) => s.price >= 350)).toBe(true);
      expect(result).toHaveLength(2); // 400 and 1500
    });

    it("filters by maximum price", () => {
      const filters: StockFilters = { ...DEFAULT_FILTERS, priceMax: 300 };
      const result = filterStocks(STOCKS, filters);
      expect(result.every((s) => s.price <= 300)).toBe(true);
      expect(result).toHaveLength(2); // 300 and 200
    });
  });

  describe("sector filter", () => {
    it("filters by sector", () => {
      const filters: StockFilters = { ...DEFAULT_FILTERS, sector: "IT" };
      const result = filterStocks(STOCKS, filters);
      expect(result.every((s) => s.sector === "IT")).toBe(true);
      expect(result).toHaveLength(3);
    });

    it("returns all when sector is 'all'", () => {
      const filters: StockFilters = { ...DEFAULT_FILTERS, sector: "all" };
      const result = filterStocks(STOCKS, filters);
      expect(result).toHaveLength(4);
    });
  });

  describe("action filter", () => {
    it("filters by evaluatedAction", () => {
      const filters: StockFilters = { ...DEFAULT_FILTERS, action: "buy_now" };
      const result = filterStocks(STOCKS, filters);
      expect(result.every((s) => s.evaluatedAction === "buy_now")).toBe(true);
    });
  });

  describe("marketCapBand filter", () => {
    it("filters small cap (< 300B)", () => {
      const filters: StockFilters = { ...DEFAULT_FILTERS, marketCapBand: "small" };
      const result = filterStocks(STOCKS, filters);
      expect(result.every((s) => s.marketCap < 300_000_000_000)).toBe(true);
    });

    it("filters mid cap (300B - 700B)", () => {
      const filters: StockFilters = { ...DEFAULT_FILTERS, marketCapBand: "mid" };
      const result = filterStocks(STOCKS, filters);
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe("4419");
    });

    it("filters large cap (>= 700B)", () => {
      const filters: StockFilters = { ...DEFAULT_FILTERS, marketCapBand: "large" };
      const result = filterStocks(STOCKS, filters);
      expect(result).toHaveLength(0);
    });
  });

  describe("growth and valuation filters", () => {
    it("filters by minimum revenue growth", () => {
      const filters: StockFilters = { ...DEFAULT_FILTERS, revenueGrowthMin: 15 };
      const result = filterStocks(STOCKS, filters);
      expect(result.every((s) => s.revenueGrowth !== null && s.revenueGrowth >= 15)).toBe(true);
    });

    it("excludes stocks with null revenueGrowth when min is set", () => {
      const filters: StockFilters = { ...DEFAULT_FILTERS, revenueGrowthMin: 0 };
      const result = filterStocks(STOCKS, filters);
      expect(result.some((s) => s.code === "4419")).toBe(false);
    });

    it("filters by maximum PER", () => {
      const filters: StockFilters = { ...DEFAULT_FILTERS, perMax: 25 };
      const result = filterStocks(STOCKS, filters);
      expect(result.every((s) => s.per === null || s.per <= 25)).toBe(true);
    });

    it("excludes stocks with null PER when perMax is set", () => {
      const filters: StockFilters = { ...DEFAULT_FILTERS, perMax: 30 };
      const result = filterStocks(STOCKS, filters);
      expect(result.some((s) => s.code === "4419")).toBe(false);
    });
  });

  describe("dividend filter", () => {
    it("filters to only stocks with dividends", () => {
      const filters: StockFilters = { ...DEFAULT_FILTERS, dividend: "with" };
      const result = filterStocks(STOCKS, filters);
      expect(result.every((s) => (s.dividendYield ?? 0) > 0)).toBe(true);
    });

    it("filters to stocks without dividends", () => {
      const filters: StockFilters = { ...DEFAULT_FILTERS, dividend: "without" };
      const result = filterStocks(STOCKS, filters);
      expect(result.every((s) => (s.dividendYield ?? 0) <= 0)).toBe(true);
    });
  });

  describe("watch filter", () => {
    it("filters to watched stocks only", () => {
      const filters: StockFilters = { ...DEFAULT_FILTERS, watch: "watching" };
      const result = filterStocks(STOCKS, filters);
      expect(result.every((s) => s.watched)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it("filters to not-watched stocks only", () => {
      const filters: StockFilters = { ...DEFAULT_FILTERS, watch: "not_watching" };
      const result = filterStocks(STOCKS, filters);
      expect(result.every((s) => !s.watched)).toBe(true);
      expect(result).toHaveLength(2);
    });
  });

  describe("combined filters", () => {
    it("applies multiple filters simultaneously", () => {
      const filters: StockFilters = {
        ...DEFAULT_FILTERS,
        sector: "IT",
        priceMax: 500,
        watch: "watching",
      };
      const result = filterStocks(STOCKS, filters);
      expect(result).toHaveLength(2);
      expect(result.every((s) => s.sector === "IT" && s.price <= 500 && s.watched)).toBe(true);
    });
  });
});

describe("sortStocks", () => {
  it("sorts by score descending by default", () => {
    const result = sortStocks(STOCKS, "score_desc");
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
    expect(result[1].score).toBeGreaterThanOrEqual(result[2].score);
  });

  it("sorts by price ascending", () => {
    const result = sortStocks(STOCKS, "price_asc");
    expect(result[0].price).toBeLessThanOrEqual(result[1].price);
    expect(result[1].price).toBeLessThanOrEqual(result[2].price);
  });

  it("sorts by price descending", () => {
    const result = sortStocks(STOCKS, "price_desc");
    expect(result[0].price).toBeGreaterThanOrEqual(result[1].price);
    expect(result[1].price).toBeGreaterThanOrEqual(result[2].price);
  });

  it("sorts by revenue growth descending", () => {
    const result = sortStocks(STOCKS, "revenue_growth_desc");
    expect(result[0].revenueGrowth).toBe(30);
    expect(result[1].revenueGrowth).toBe(20);
  });

  it("sorts by op growth descending", () => {
    const result = sortStocks(STOCKS, "op_growth_desc");
    expect(result[0].opGrowth).toBe(35);
    expect(result[1].opGrowth).toBe(18);
  });

  it("does not mutate the original array", () => {
    const original = [...STOCKS];
    sortStocks(STOCKS, "price_asc");
    expect(STOCKS.map((s) => s.code)).toEqual(original.map((s) => s.code));
  });

  it("handles null growth values in sorting", () => {
    const result = sortStocks(STOCKS, "revenue_growth_desc");
    const nullStock = result.find((s) => s.revenueGrowth === null);
    expect(result.indexOf(nullStock!)).toBe(result.length - 1);
  });
});

describe("saved-screen restore parity", () => {
  it("restores filters/sort/rankingSort/compare exactly from saved screen", () => {
    const screen: SavedScreen = {
      id: "screen-1",
      name: "buy-now-watch",
      filters: {
        query: "通信",
        sector: "IT",
        action: "buy_now",
        watch: "watching",
        priceMax: 500,
      },
      sortKey: "price_asc",
      rankingSortKey: "operating_cf_desc",
      compareSelection: ["9424", "2337"],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    const restored = restoreSavedScreenState(screen);

    expect(restored).toMatchObject({
      filters: {
        ...DEFAULT_FILTERS,
        query: "通信",
        sector: "IT",
        action: "buy_now",
        watch: "watching",
        priceMax: 500,
      },
      sortKey: "price_asc",
      rankingSortKey: "operating_cf_desc",
      compareSelection: ["9424", "2337"],
    });
  });

  it("ignores invalid filter value types and enums", () => {
    const screen: SavedScreen = {
      id: "screen-invalid",
      name: "invalid-filters",
      filters: {
        query: 123,
        sector: "IT",
        action: "invalid",
        marketCapBand: "small",
        dividend: "with",
        watch: "invalid",
        priceMin: "100",
        priceMax: 500,
        pbrMax: Number.NaN,
      },
      sortKey: "score_desc",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    const restored = restoreSavedScreenState(screen);

    expect(restored.filters).toMatchObject({
      ...DEFAULT_FILTERS,
      sector: "IT",
      marketCapBand: "small",
      dividend: "with",
      priceMax: 500,
      action: "all",
      watch: "all",
      priceMin: null,
      pbrMax: null,
      query: "",
    });
  });

  it("trims compareSelection values and removes whitespace-only duplicates", () => {
    const screen: SavedScreen = {
      id: "screen-compare-trim",
      name: "compare-trim",
      filters: {},
      sortKey: "score_desc",
      compareSelection: [" 9424 ", "", "9424", "  ", "2337 "],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    const restored = restoreSavedScreenState(screen);

    expect(restored.compareSelection).toEqual(["9424", "2337"]);
  });
});

describe("saved-screen apply parity", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useStockStore.setState(useStockStore.getInitialState(), true);
  });

  it("applySavedScreen matches restoreSavedScreenState semantics", () => {
    const screen: SavedScreen = {
      id: "screen-apply",
      name: "screen-apply",
      filters: {
        query: 123,
        action: "buy_now",
        watch: "invalid",
        priceMax: 500,
      },
      sortKey: "invalid-sort-key",
      rankingSortKey: "invalid-ranking-key",
      compareSelection: ["9424", "", "9424", 123 as unknown as string],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    const expected = restoreSavedScreenState(screen);

    useStockStore.setState({
      savedScreens: [screen],
      filters: { ...DEFAULT_FILTERS, query: "before" },
      sortKey: "price_desc",
      rankingSortKey: "action_priority",
      compareSelection: ["4477"],
    });

    useStockStore.getState().applySavedScreen(screen.id);
    const state = useStockStore.getState();

    expect(state.filters).toEqual(expected.filters);
    expect(state.sortKey).toBe(expected.sortKey);
    expect(state.rankingSortKey).toBe(expected.rankingSortKey);
    expect(state.compareSelection).toEqual(expected.compareSelection);
  });
});

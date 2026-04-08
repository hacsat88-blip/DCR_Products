import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  fetchStocks: vi.fn(),
  search: vi.fn()
}));

vi.mock("@/services/stockService", () => ({
  stockService: {
    fetchStocks: serviceMocks.fetchStocks
  }
}));

vi.mock("@/services/stockSearchService", () => ({
  stockSearchService: {
    search: serviceMocks.search
  }
}));

import { DEFAULT_STOCK_CODES } from "@/services/providers/types";
import { useStockStore } from "@/store/useStockStore";

import {
  ALERT_CONDITION_STATE_KEY,
  ALERT_EVENTS_KEY,
  ALERT_RULES_KEY,
  ALERT_SNAPSHOTS_KEY,
  ARCHIVE_COMPARE_KEY,
  HOLDINGS_KEY,
  HYPOTHESIS_KEY,
  MEMO_KEY,
  REGISTERED_CODES_KEY,
  REGISTERED_NAME_MAP_KEY,
  REGISTERED_PROFILE_MAP_KEY,
  WATCH_KEY
} from "./helpers";

function makeStock(
  code: string,
  overrides: Partial<{
    id: string;
    name: string;
    oneLiner: string;
    summary: string;
    sector: string;
    watched: boolean;
  }> = {}
) {
  const name = overrides.name ?? `銘柄 ${code}`;
  return {
    id: overrides.id ?? `live-${code}`,
    code,
    name,
    sector: overrides.sector ?? "未分類",
    themeTags: [],
    price: 1200,
    changePercent: 1.2,
    marketCap: 2_000_000_000,
    per: 22,
    pbr: 2.4,
    dividendYield: 0.8,
    revenueGrowth: 12,
    opGrowth: 10,
    operatingCF: 1000,
    manualAction: null,
    hasDilutionRisk: false,
    hasOneOffProfitRisk: false,
    oneLiner: overrides.oneLiner ?? "追加監視銘柄です。",
    summary: overrides.summary ?? "追加監視銘柄のため詳細取得待ちです。",
    coreKpiLabel: "売上成長率",
    coreKpiValue: "+12.0%",
    riskSignal: "次回決算で確認してください。",
    collapseCondition: "成長率が鈍化した場合",
    priceUpdatedAt: "2024-01-05T00:00:00Z",
    priceSourceLabel: "YF",
    fundamentalsUpdatedAt: "2024-01-05T00:00:00Z",
    fundamentalsSubmitDate: "2024-01-05T00:00:00Z",
    fundamentalsSourceLabel: "C",
    watched: overrides.watched ?? false,
    chartData: []
  };
}

function makeFetchResult(
  code: string,
  overrides: Partial<{ name: string; oneLiner: string; summary: string; sector: string }>
) {
  return {
    stocks: [
      makeStock(code, {
        name: overrides.name,
        sector: overrides.sector,
        oneLiner: overrides.oneLiner,
        summary: overrides.summary
      })
    ],
    dataMode: "live" as const,
    sourceLabel: "YF" as const,
    sourceMeta: { overall: "YF" as const, price: "YF" as const, fundamentals: "C" as const },
    lastUpdatedAt: "2024-01-05T00:00:00Z",
    error: null,
    fallbackReason: null,
    health: []
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  useStockStore.setState(useStockStore.getInitialState(), true);
});

describe("coreSlice API-added stock narratives", () => {
  it("persists registered profile data when registering a searched stock", async () => {
    serviceMocks.fetchStocks.mockResolvedValueOnce(
      makeFetchResult("9999", {
        name: "テストHD",
        sector: "SaaS",
        oneLiner: "provider fallback",
        summary: "provider fallback summary"
      })
    );

    const result = await useStockStore.getState().registerSearchedStock({
      code: "9999",
      name: "テストHD",
      sector: "SaaS",
      oneLiner: "テストHDは法人向けSaaSを展開しています。",
      summary: "テストHDは法人向けSaaSを主力とし、継続課金で収益を積み上げています。"
    });

    const storedProfiles = JSON.parse(window.localStorage.getItem(REGISTERED_PROFILE_MAP_KEY) ?? "{}");
    const stock = useStockStore.getState().stocks.find((item) => item.code === "9999");

    expect(result.ok).toBe(true);
    expect(storedProfiles["9999"].oneLiner).toContain("法人向けSaaS");
    expect(storedProfiles["9999"].backfillState).toBe("resolved");
    expect(stock?.oneLiner).toContain("法人向けSaaS");
    expect(stock?.summary).toContain("継続課金");
  });

  it("backfills existing registered API-added stocks only once when profile metadata is missing", async () => {
    window.localStorage.setItem(REGISTERED_CODES_KEY, JSON.stringify([...DEFAULT_STOCK_CODES, "8888"]));
    window.localStorage.setItem(REGISTERED_NAME_MAP_KEY, JSON.stringify({ "8888": "既存登録銘柄" }));

    serviceMocks.fetchStocks.mockResolvedValueOnce(
      makeFetchResult("8888", {
        name: "既存登録銘柄",
        sector: "未分類",
        oneLiner: "provider fallback",
        summary: "provider fallback summary"
      })
    );
    serviceMocks.search.mockResolvedValueOnce({
      results: [
        {
          code: "8888",
          name: "既存登録銘柄",
          source: "edinet",
          isRegistered: false,
          sector: "SaaS",
          oneLiner: "既存登録銘柄は法人向けSaaSを展開しています。",
          summary: "既存登録銘柄は法人向けSaaSを主力とし、継続課金を積み上げる企業です。"
        }
      ],
      error: null
    });

    await useStockStore.getState().initialize();
    await useStockStore.getState().refreshStocks();

    const stock = useStockStore.getState().stocks.find((item) => item.code === "8888");
    const storedProfiles = JSON.parse(window.localStorage.getItem(REGISTERED_PROFILE_MAP_KEY) ?? "{}");

    expect(serviceMocks.search).toHaveBeenCalledWith("8888");
    expect(stock?.oneLiner).toContain("法人向けSaaS");
    expect(stock?.summary).toContain("継続課金");
    expect(storedProfiles["8888"].backfillState).toBe("resolved");
  });

  it("removes a registered stock from state and persisted maps without leaving stale selection", () => {
    useStockStore.setState({
      stocks: [
        makeStock("9424", { watched: true }),
        makeStock("2337", { id: "mock-2337" })
      ],
      registeredCodes: ["9424", "2337"],
      registeredNameMap: { "9424": "日本通信", "2337": "いちご" },
      registeredProfileMap: {
        "9424": {
          sector: "通信",
          oneLiner: "削除対象です。",
          summary: "削除対象の詳細です。",
          backfillState: "resolved",
          updatedAt: "2024-01-05T00:00:00Z"
        }
      },
      watchMap: { "live-9424": true, "mock-2337": true },
      holdingsMap: { "live-9424": 100, "mock-2337": 20 },
      memoMap: { "live-9424": "削除予定", "mock-2337": "保持" },
      hypothesisMap: {
        "live-9424": {
          hypothesis: "削除",
          rationale: "",
          reviewDate: "",
          outcome: "",
          updatedAt: "2024-01-05T00:00:00Z"
        }
      },
      compareSelection: ["9424", "2337"],
      selectedStockId: "live-9424",
      detailOpen: true
    });

    const result = useStockStore.getState().removeRegisteredStock("9424");

    expect(result).toEqual({ ok: true });
    expect(useStockStore.getState().registeredCodes).toEqual(["2337"]);
    expect(useStockStore.getState().stocks.map((stock) => stock.code)).toEqual(["2337"]);
    expect(useStockStore.getState().registeredNameMap).toEqual({ "2337": "いちご" });
    expect(useStockStore.getState().registeredProfileMap).toEqual({});
    expect(useStockStore.getState().watchMap).toEqual({ "mock-2337": true });
    expect(useStockStore.getState().holdingsMap).toEqual({ "mock-2337": 20 });
    expect(useStockStore.getState().memoMap).toEqual({ "mock-2337": "保持" });
    expect(useStockStore.getState().hypothesisMap).toEqual({});
    expect(useStockStore.getState().compareSelection).toEqual(["2337"]);
    expect(useStockStore.getState().selectedStockId).toBe("mock-2337");
    expect(useStockStore.getState().detailOpen).toBe(true);

    expect(window.localStorage.getItem(REGISTERED_CODES_KEY)).toBe(JSON.stringify(["2337"]));
    expect(window.localStorage.getItem(REGISTERED_NAME_MAP_KEY)).toBe(
      JSON.stringify({ "2337": "いちご" })
    );
    expect(window.localStorage.getItem(REGISTERED_PROFILE_MAP_KEY)).toBe(JSON.stringify({}));
    expect(window.localStorage.getItem(WATCH_KEY)).toBe(JSON.stringify({ "mock-2337": true }));
    expect(window.localStorage.getItem(HOLDINGS_KEY)).toBe(JSON.stringify({ "mock-2337": 20 }));
    expect(window.localStorage.getItem(MEMO_KEY)).toBe(JSON.stringify({ "mock-2337": "保持" }));
    expect(window.localStorage.getItem(HYPOTHESIS_KEY)).toBe(JSON.stringify({}));
    expect(window.localStorage.getItem(ARCHIVE_COMPARE_KEY)).toBe(JSON.stringify(["2337"]));
  });

  it("keeps an explicit empty registration list empty after removing the last stock", async () => {
    useStockStore.setState({
      stocks: [makeStock("9424", { watched: true })],
      registeredCodes: ["9424"],
      selectedStockId: "live-9424",
      detailOpen: true,
      watchMap: { "live-9424": true },
      holdingsMap: { "live-9424": 10 },
      compareSelection: ["9424"]
    });

    const removed = useStockStore.getState().removeRegisteredStock("9424");

    expect(removed).toEqual({ ok: true });
    expect(useStockStore.getState().registeredCodes).toEqual([]);
    expect(useStockStore.getState().stocks).toEqual([]);
    expect(useStockStore.getState().selectedStockId).toBeNull();
    expect(useStockStore.getState().detailOpen).toBe(false);
    expect(window.localStorage.getItem(REGISTERED_CODES_KEY)).toBe(JSON.stringify([]));

    await useStockStore.getState().refreshStocks();

    expect(serviceMocks.fetchStocks).not.toHaveBeenCalled();
    expect(useStockStore.getState().registeredCodes).toEqual([]);

    useStockStore.setState(useStockStore.getInitialState(), true);
    await useStockStore.getState().initialize();

    expect(useStockStore.getState().registeredCodes).toEqual([]);
  });

  it("cleans stock-scoped alert state when removing a registered stock", () => {
    useStockStore.setState({
      stocks: [makeStock("9424"), makeStock("2337", { id: "mock-2337" })],
      registeredCodes: ["9424", "2337"],
      alertRules: [
        {
          id: "rule-9424",
          stockCode: "9424",
          scope: "stock",
          type: "price_above",
          enabled: true,
          threshold: 1000,
          createdAt: "2024-01-05T00:00:00Z",
          updatedAt: "2024-01-05T00:00:00Z"
        },
        {
          id: "rule-global",
          scope: "global",
          type: "provider_degraded",
          enabled: true,
          createdAt: "2024-01-05T00:00:00Z",
          updatedAt: "2024-01-05T00:00:00Z"
        }
      ],
      alertEvents: [
        {
          id: "event-9424",
          ruleId: "rule-9424",
          stockCode: "9424",
          title: "日本通信のアラート",
          message: "価格上昇",
          severity: "info",
          triggeredAt: "2024-01-05T00:00:00Z",
          read: false,
          dismissed: false
        },
        {
          id: "event-global",
          ruleId: "rule-global",
          title: "全体アラート",
          message: "provider",
          severity: "warning",
          triggeredAt: "2024-01-05T00:00:00Z",
          read: false,
          dismissed: false
        }
      ],
      previousSnapshots: {
        "9424": {
          code: "9424",
          price: 1200,
          changePercent: 1.2,
          score: 70,
          evaluatedAction: "buy_now",
          revenueGrowth: 12,
          opGrowth: 10,
          operatingCF: 1000,
          dataMode: "live",
          providerHealth: "yahoo:ok",
          checkedAt: "2024-01-05T00:00:00Z"
        },
        "2337": {
          code: "2337",
          price: 900,
          changePercent: 0.4,
          score: 55,
          evaluatedAction: "wait_pullback",
          revenueGrowth: 8,
          opGrowth: 6,
          operatingCF: 500,
          dataMode: "live",
          providerHealth: "yahoo:ok",
          checkedAt: "2024-01-05T00:00:00Z"
        }
      },
      alertConditionState: {
        "rule-9424|9424|price_above": true,
        "rule-global|global|provider_degraded": false
      }
    });

    const removed = useStockStore.getState().removeRegisteredStock("9424");

    expect(removed).toEqual({ ok: true });
    expect(useStockStore.getState().alertRules.map((rule) => rule.id)).toEqual(["rule-global"]);
    expect(useStockStore.getState().alertEvents.map((event) => event.id)).toEqual(["event-global"]);
    expect(useStockStore.getState().previousSnapshots).toEqual({
      "2337": {
        code: "2337",
        price: 900,
        changePercent: 0.4,
        score: 55,
        evaluatedAction: "wait_pullback",
        revenueGrowth: 8,
        opGrowth: 6,
        operatingCF: 500,
        dataMode: "live",
        providerHealth: "yahoo:ok",
        checkedAt: "2024-01-05T00:00:00Z"
      }
    });
    expect(useStockStore.getState().alertConditionState).toEqual({
      "rule-global|global|provider_degraded": false
    });
    expect(window.localStorage.getItem(ALERT_RULES_KEY)).toBe(
      JSON.stringify([
        {
          id: "rule-global",
          scope: "global",
          type: "provider_degraded",
          enabled: true,
          createdAt: "2024-01-05T00:00:00Z",
          updatedAt: "2024-01-05T00:00:00Z"
        }
      ])
    );
    expect(window.localStorage.getItem(ALERT_EVENTS_KEY)).toBe(
      JSON.stringify([
        {
          id: "event-global",
          ruleId: "rule-global",
          title: "全体アラート",
          message: "provider",
          severity: "warning",
          triggeredAt: "2024-01-05T00:00:00Z",
          read: false,
          dismissed: false
        }
      ])
    );
    expect(window.localStorage.getItem(ALERT_SNAPSHOTS_KEY)).toBe(
      JSON.stringify({
        "2337": {
          code: "2337",
          price: 900,
          changePercent: 0.4,
          score: 55,
          evaluatedAction: "wait_pullback",
          revenueGrowth: 8,
          opGrowth: 6,
          operatingCF: 500,
          dataMode: "live",
          providerHealth: "yahoo:ok",
          checkedAt: "2024-01-05T00:00:00Z"
        }
      })
    );
    expect(window.localStorage.getItem(ALERT_CONDITION_STATE_KEY)).toBe(
      JSON.stringify({
        "rule-global|global|provider_degraded": false
      })
    );
  });
});

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useStockStore } from "@/store/useStockStore";
import { EvaluatedStock } from "@/types/stock";

import { deriveActionLanes, deriveRankingRows, useDashboardDerived } from "./useDashboardDerived";

function makeStock(code: string, score: number): EvaluatedStock {
  return {
    id: `live-${code}`,
    code,
    name: `銘柄 ${code}`,
    sector: "情報・通信",
    themeTags: [],
    price: 1000 + score,
    changePercent: 1,
    marketCap: 2_000_000_000,
    per: 20,
    pbr: 2,
    dividendYield: 1,
    revenueGrowth: 10,
    opGrowth: 12,
    operatingCF: 1000,
    manualAction: null,
    hasDilutionRisk: false,
    hasOneOffProfitRisk: false,
    oneLiner: "派生データ確認用です。",
    summary: "派生データ確認用のサマリーです。",
    coreKpiLabel: "売上成長率",
    coreKpiValue: "+10.0%",
    riskSignal: "特になし",
    collapseCondition: "成長鈍化",
    priceUpdatedAt: "2024-01-05T00:00:00Z",
    priceSourceLabel: "YF",
    fundamentalsUpdatedAt: "2024-01-05T00:00:00Z",
    fundamentalsSubmitDate: "2024-01-05T00:00:00Z",
    fundamentalsSourceLabel: "C",
    watched: false,
    chartData: [],
    score,
    evaluatedAction: "buy_now",
    breakdown: [],
    scoreSummary: "良好",
    actionReason: "テスト用",
    riskFlags: []
  };
}

describe("useDashboardDerived", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    useStockStore.setState(useStockStore.getInitialState(), true);
  });

  it("updates filtered and ranked rows after a registered stock is removed", () => {
    useStockStore.setState({
      stocks: [makeStock("9424", 80), makeStock("2337", 60)],
      registeredCodes: ["9424", "2337"],
      registeredNameMap: { "9424": "日本通信", "2337": "いちご" }
    });

    const { result } = renderHook(() => useDashboardDerived());

    expect(result.current.filteredStocks.map((stock) => stock.code)).toEqual(["9424", "2337"]);
    expect(result.current.rankedRows.map((stock) => stock.code)).toEqual(["9424", "2337"]);

    act(() => {
      useStockStore.getState().removeRegisteredStock("9424");
    });

    expect(result.current.filteredStocks.map((stock) => stock.code)).toEqual(["2337"]);
    expect(result.current.rankedRows.map((stock) => stock.code)).toEqual(["2337"]);
  });

  it("exposes all Phase 5 panels in the expected tabs", () => {
    const { result } = renderHook(() => useDashboardDerived());

    const panelTabs =
      ((result.current as unknown as { dashboardPanels?: Record<string, string> }).dashboardPanels ?? {});

    expect(panelTabs).toMatchObject({
      ranking: "market",
      compare: "analysis",
      snapshot: "analysis",
      timeline: "analysis",
      export: "portfolio",
      savedScreens: "settings",
      navigator: "market"
    });
  });

  it("uses the same evaluated action in ranking and action lane", () => {
    const stocks = [makeStock("9424", 88), makeStock("2337", 72), makeStock("4477", 64)];
    stocks[1].evaluatedAction = "wait_pullback";
    stocks[2].evaluatedAction = "exclude";

    const ranked = deriveRankingRows(stocks, "action_priority", []);
    const lanes = deriveActionLanes(stocks);

    expect(ranked.map((stock) => stock.evaluatedAction).sort()).toEqual(
      lanes.flatMap((lane) => lane.items.map((stock) => stock.evaluatedAction)).sort()
    );
  });
});

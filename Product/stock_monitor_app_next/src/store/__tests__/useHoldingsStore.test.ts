import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  HOLDINGS_STORAGE_KEY,
  useHoldingsStore,
  type Holding,
  type HoldingInput,
} from "../useHoldingsStore";

const SAMPLE: HoldingInput = {
  symbol: "7203",
  name: "トヨタ自動車",
  market: "JP",
  quantity: 100,
  averageCost: 2500,
  acquiredAt: "2024-01-10",
  sector: "自動車",
};

beforeEach(() => {
  useHoldingsStore.setState({ holdings: [] }, false);
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(HOLDINGS_STORAGE_KEY);
  }
});

afterEach(() => {
  useHoldingsStore.setState({ holdings: [] }, false);
});

describe("useHoldingsStore", () => {
  it("addHolding で state に反映され、id が付与される", () => {
    const added = useHoldingsStore.getState().addHolding(SAMPLE);
    const holdings = useHoldingsStore.getState().holdings;
    expect(holdings).toHaveLength(1);
    expect(holdings[0]!.id).toBe(added.id);
    expect(holdings[0]!.symbol).toBe("7203");
    expect(added.id.length).toBeGreaterThan(0);
  });

  it("updateHolding で patch が適用される", () => {
    const added = useHoldingsStore.getState().addHolding(SAMPLE);
    useHoldingsStore.getState().updateHolding(added.id, { quantity: 200, note: "追加" });
    const found = useHoldingsStore.getState().holdings.find((h) => h.id === added.id);
    expect(found?.quantity).toBe(200);
    expect(found?.note).toBe("追加");
    expect(found?.symbol).toBe("7203");
  });

  it("removeHolding でエントリが削減される", () => {
    const a = useHoldingsStore.getState().addHolding(SAMPLE);
    useHoldingsStore.getState().addHolding({ ...SAMPLE, symbol: "9984" });
    useHoldingsStore.getState().removeHolding(a.id);
    const holdings = useHoldingsStore.getState().holdings;
    expect(holdings).toHaveLength(1);
    expect(holdings[0]!.symbol).toBe("9984");
  });

  it("importHoldings で全置換される", () => {
    useHoldingsStore.getState().addHolding(SAMPLE);
    const items: Holding[] = [
      {
        id: "h1",
        symbol: "AAPL",
        market: "US",
        quantity: 10,
        averageCost: 180,
        acquiredAt: "2024-03-01",
      },
      {
        id: "h2",
        symbol: "MSFT",
        market: "US",
        quantity: 5,
        averageCost: 400,
        acquiredAt: "2024-04-01",
      },
    ];
    useHoldingsStore.getState().importHoldings(items);
    expect(useHoldingsStore.getState().holdings).toEqual(items);
  });

  it("getTotalCostBasis で合計取得額を返す", () => {
    const s = useHoldingsStore.getState();
    s.addHolding(SAMPLE); // 100 * 2500 = 250000
    s.addHolding({ ...SAMPLE, symbol: "9984", quantity: 50, averageCost: 6000 }); // 300000
    expect(useHoldingsStore.getState().getTotalCostBasis()).toBe(550_000);
  });

  it("getBySector / getByMarket で分類できる", () => {
    const s = useHoldingsStore.getState();
    s.addHolding(SAMPLE);
    s.addHolding({ ...SAMPLE, symbol: "9984", sector: "通信" });
    s.addHolding({ ...SAMPLE, symbol: "AAPL", market: "US", sector: undefined });
    const bySector = useHoldingsStore.getState().getBySector();
    expect(bySector.get("自動車")).toHaveLength(1);
    expect(bySector.get("通信")).toHaveLength(1);
    expect(bySector.get("未分類")).toHaveLength(1);
    const byMarket = useHoldingsStore.getState().getByMarket();
    expect(byMarket.get("JP")).toHaveLength(2);
    expect(byMarket.get("US")).toHaveLength(1);
  });

  it("clearAll で空になる", () => {
    useHoldingsStore.getState().addHolding(SAMPLE);
    useHoldingsStore.getState().clearAll();
    expect(useHoldingsStore.getState().holdings).toEqual([]);
  });
});

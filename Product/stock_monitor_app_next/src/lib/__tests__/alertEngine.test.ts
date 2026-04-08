import { describe, it, expect } from "vitest";
import { evaluateAlerts, buildAlertSnapshots, ALERT_EVENTS_MAX } from "@/lib/alertEngine";
import type { AlertEngineInput, AlertRule, AlertEvent, PreviousStockSnapshot } from "@/types/alert";
import type { EvaluatedStock } from "@/types/stock";
import type { ProviderHealth, DataMode } from "@/services/providers/types";

function makeEvaluatedStock(overrides: Partial<EvaluatedStock> = {}): EvaluatedStock {
  return {
    id: "test-1",
    code: "9424",
    name: "日本通信",
    sector: "IT",
    themeTags: [],
    price: 300,
    changePercent: 2.5,
    marketCap: 30_000_000_000,
    per: 25,
    pbr: 2.0,
    dividendYield: 1.0,
    revenueGrowth: 20,
    opGrowth: 18,
    operatingCF: 500,
    oneLiner: "テスト",
    summary: "",
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

function makeRule(overrides: Partial<AlertRule> = {}): AlertRule {
  return {
    id: "rule-1",
    scope: "global",
    type: "price_above",
    enabled: true,
    threshold: 500,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<PreviousStockSnapshot> = {}): PreviousStockSnapshot {
  return {
    code: "9424",
    price: 280,
    changePercent: 1.0,
    score: 70,
    evaluatedAction: "wait_earnings",
    revenueGrowth: 15,
    opGrowth: 12,
    operatingCF: 300,
    dataMode: "mock",
    providerHealth: "jquants:ok",
    checkedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

const HEALTHY: ProviderHealth[] = [
  {
    provider: "jquants",
    ok: true,
    message: null,
    errorCode: null,
    latencyMs: 100,
    fetchedAt: "2024-01-01T01:00:00Z",
    sourceTimestamp: "2024-01-01T00:30:00Z",
    sourceLabel: null,
  },
];

function makeInput(overrides: Partial<AlertEngineInput> = {}): AlertEngineInput {
  return {
    stocks: [makeEvaluatedStock()],
    rules: [],
    existingEvents: [],
    previousSnapshots: {},
    conditionState: {},
    dataMode: "mock" as DataMode,
    health: HEALTHY,
    checkedAt: "2024-01-01T01:00:00Z",
    ...overrides,
  };
}

describe("evaluateAlerts", () => {
  describe("price_above rule", () => {
    it("triggers when price exceeds threshold", () => {
      const input = makeInput({
        rules: [makeRule({ type: "price_above", threshold: 200 })],
      });
      const result = evaluateAlerts(input);
      expect(result.triggeredEvents.length).toBe(1);
      expect(result.triggeredEvents[0].title).toContain("価格上抜け");
    });

    it("does not trigger when price is below threshold", () => {
      const input = makeInput({
        rules: [makeRule({ type: "price_above", threshold: 500 })],
      });
      const result = evaluateAlerts(input);
      expect(result.triggeredEvents.length).toBe(0);
    });
  });

  describe("price_below rule", () => {
    it("triggers when price is at or below threshold", () => {
      const input = makeInput({
        rules: [makeRule({ type: "price_below", threshold: 300 })],
      });
      const result = evaluateAlerts(input);
      expect(result.triggeredEvents.length).toBe(1);
      expect(result.triggeredEvents[0].title).toContain("押し目到達");
    });

    it("does not trigger when price is above threshold", () => {
      const input = makeInput({
        rules: [makeRule({ type: "price_below", threshold: 100 })],
      });
      const result = evaluateAlerts(input);
      expect(result.triggeredEvents.length).toBe(0);
    });
  });

  describe("score_above / score_below rules", () => {
    it("triggers score_above when score meets threshold", () => {
      const input = makeInput({
        rules: [makeRule({ type: "score_above", threshold: 70 })],
      });
      const result = evaluateAlerts(input);
      expect(result.triggeredEvents.length).toBe(1);
    });

    it("does not trigger score_above when score is below threshold", () => {
      const input = makeInput({
        rules: [makeRule({ type: "score_above", threshold: 80 })],
      });
      const result = evaluateAlerts(input);
      expect(result.triggeredEvents.length).toBe(0);
    });

    it("triggers score_below when score meets threshold", () => {
      const input = makeInput({
        stocks: [makeEvaluatedStock({ score: 35 })],
        rules: [makeRule({ type: "score_below", threshold: 40 })],
      });
      const result = evaluateAlerts(input);
      expect(result.triggeredEvents.length).toBe(1);
    });
  });

  describe("action_changed rule (diff rule)", () => {
    it("triggers when action differs from previous snapshot", () => {
      const input = makeInput({
        rules: [makeRule({ type: "action_changed" })],
        previousSnapshots: { "9424": makeSnapshot({ evaluatedAction: "wait_earnings" }) },
      });
      const result = evaluateAlerts(input);
      expect(result.triggeredEvents.length).toBe(1);
      expect(result.triggeredEvents[0].title).toContain("判定変更");
    });

    it("does not trigger when action is the same", () => {
      const input = makeInput({
        rules: [makeRule({ type: "action_changed" })],
        previousSnapshots: { "9424": makeSnapshot({ evaluatedAction: "buy_now" }) },
      });
      const result = evaluateAlerts(input);
      expect(result.triggeredEvents.length).toBe(0);
    });

    it("skips evaluation when no previous snapshots exist", () => {
      const input = makeInput({
        rules: [makeRule({ type: "action_changed" })],
        previousSnapshots: {},
      });
      const result = evaluateAlerts(input);
      expect(result.triggeredEvents.length).toBe(0);
    });
  });

  describe("action_downgraded_to_exclude rule", () => {
    it("triggers when stock degrades to exclude", () => {
      const input = makeInput({
        stocks: [makeEvaluatedStock({ evaluatedAction: "exclude" })],
        rules: [makeRule({ type: "action_downgraded_to_exclude" })],
        previousSnapshots: { "9424": makeSnapshot({ evaluatedAction: "wait_earnings" }) },
      });
      const result = evaluateAlerts(input);
      expect(result.triggeredEvents.length).toBe(1);
      expect(result.triggeredEvents[0].severity).toBe("critical");
    });
  });

  describe("operating_cf_negative rule", () => {
    it("triggers when CF flips from positive to negative", () => {
      const input = makeInput({
        stocks: [makeEvaluatedStock({ operatingCF: -100 })],
        rules: [makeRule({ type: "operating_cf_negative" })],
        previousSnapshots: { "9424": makeSnapshot({ operatingCF: 500 }) },
      });
      const result = evaluateAlerts(input);
      expect(result.triggeredEvents.length).toBe(1);
    });

    it("does not trigger when CF was already negative", () => {
      const input = makeInput({
        stocks: [makeEvaluatedStock({ operatingCF: -100 })],
        rules: [makeRule({ type: "operating_cf_negative" })],
        previousSnapshots: { "9424": makeSnapshot({ operatingCF: -50 }) },
      });
      const result = evaluateAlerts(input);
      expect(result.triggeredEvents.length).toBe(0);
    });
  });

  describe("data_fallback (global rule)", () => {
    it("triggers when dataMode is fallback", () => {
      const input = makeInput({
        dataMode: "fallback",
        rules: [makeRule({ type: "data_fallback" })],
      });
      const result = evaluateAlerts(input);
      expect(result.triggeredEvents.length).toBe(1);
    });

    it("does not trigger in mock or live mode", () => {
      const input = makeInput({
        dataMode: "live",
        rules: [makeRule({ type: "data_fallback" })],
      });
      const result = evaluateAlerts(input);
      expect(result.triggeredEvents.length).toBe(0);
    });
  });

  describe("provider_degraded (global rule)", () => {
    it("triggers when a provider is unhealthy", () => {
      const degradedHealth: ProviderHealth[] = [
        { ...HEALTHY[0], ok: false, errorCode: "network", message: "timeout" },
      ];
      const input = makeInput({
        health: degradedHealth,
        rules: [makeRule({ type: "provider_degraded" })],
      });
      const result = evaluateAlerts(input);
      expect(result.triggeredEvents.length).toBe(1);
    });
  });

  describe("cooldown and deduplication", () => {
    it("suppresses persistent rule when condition was already active", () => {
      const dedupeKey = "rule-1|9424|price>=200";
      const input = makeInput({
        rules: [makeRule({ id: "rule-1", type: "price_above", threshold: 200, cooldownMinutes: 60 })],
        conditionState: { [dedupeKey]: true },
      });
      const result = evaluateAlerts(input);
      expect(result.triggeredEvents.length).toBe(0);
    });
  });

  describe("disabled rules", () => {
    it("does not evaluate disabled rules", () => {
      const input = makeInput({
        rules: [makeRule({ type: "price_above", threshold: 200, enabled: false })],
      });
      const result = evaluateAlerts(input);
      expect(result.triggeredEvents.length).toBe(0);
    });
  });

  describe("scope filtering", () => {
    it("stock scope only evaluates matching stock code", () => {
      const input = makeInput({
        stocks: [
          makeEvaluatedStock({ code: "9424", price: 300 }),
          makeEvaluatedStock({ code: "2337", price: 600 }),
        ],
        rules: [makeRule({ type: "price_above", threshold: 500, scope: "stock", stockCode: "2337" })],
      });
      const result = evaluateAlerts(input);
      expect(result.triggeredEvents.length).toBe(1);
      expect(result.triggeredEvents[0].stockCode).toBe("2337");
    });

    it("watchlist scope only evaluates watched stocks", () => {
      const input = makeInput({
        stocks: [
          makeEvaluatedStock({ code: "9424", watched: true, price: 300 }),
          makeEvaluatedStock({ code: "2337", watched: false, price: 600 }),
        ],
        rules: [makeRule({ type: "price_above", threshold: 200, scope: "watchlist" })],
      });
      const result = evaluateAlerts(input);
      expect(result.triggeredEvents.length).toBe(1);
      expect(result.triggeredEvents[0].stockCode).toBe("9424");
    });
  });

  describe("result structure", () => {
    it("returns snapshots for all stocks", () => {
      const input = makeInput({
        stocks: [
          makeEvaluatedStock({ code: "9424" }),
          makeEvaluatedStock({ code: "2337" }),
        ],
      });
      const result = evaluateAlerts(input);
      expect(result.snapshots["9424"]).toBeDefined();
      expect(result.snapshots["2337"]).toBeDefined();
    });

    it("returns lastEvaluationAt matching checkedAt", () => {
      const input = makeInput({ checkedAt: "2024-06-01T12:00:00Z" });
      const result = evaluateAlerts(input);
      expect(result.lastEvaluationAt).toBe("2024-06-01T12:00:00Z");
    });
  });
});

describe("buildAlertSnapshots", () => {
  it("builds snapshots from evaluated stocks", () => {
    const stocks = [makeEvaluatedStock({ code: "9424", price: 300, score: 75 })];
    const snapshots = buildAlertSnapshots(stocks, "mock", HEALTHY, "2024-01-01T00:00:00Z");
    expect(snapshots["9424"]).toBeDefined();
    expect(snapshots["9424"].price).toBe(300);
    expect(snapshots["9424"].score).toBe(75);
    expect(snapshots["9424"].checkedAt).toBe("2024-01-01T00:00:00Z");
  });

  it("handles empty stock array", () => {
    const snapshots = buildAlertSnapshots([], "mock", HEALTHY, "2024-01-01T00:00:00Z");
    expect(Object.keys(snapshots).length).toBe(0);
  });

  it("uses provider health timestamps as fallback", () => {
    const stocks = [makeEvaluatedStock({ code: "9424", priceUpdatedAt: null })];
    const snapshots = buildAlertSnapshots(stocks, "mock", HEALTHY, "2024-01-01T00:00:00Z");
    expect(snapshots["9424"].priceUpdatedAt).toBe("2024-01-01T00:30:00Z");
  });
});

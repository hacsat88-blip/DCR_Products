import { describe, it, expect } from "vitest";

import { evaluateRule } from "@/lib/alerts/evaluate";
import type { AlertRule } from "@/store/useAlertsStore";

function makeRule(overrides: Partial<AlertRule["condition"]> & { id?: string }): AlertRule {
  return {
    id: overrides.id ?? "r1",
    symbol: "7203",
    market: "JP",
    condition: {
      op: overrides.op ?? ">=",
      target: overrides.target ?? 100,
      field: overrides.field ?? "price",
    },
    notifyChannels: ["discord"],
    enabled: true,
    createdAt: new Date().toISOString(),
  };
}

describe("evaluateRule", () => {
  it(">= triggers when price meets threshold", () => {
    const rule = makeRule({ op: ">=", target: 100, field: "price" });
    expect(evaluateRule(rule, { price: 105 }).triggered).toBe(true);
    expect(evaluateRule(rule, { price: 99 }).triggered).toBe(false);
  });

  it("<= triggers when price breaches lower threshold", () => {
    const rule = makeRule({ op: "<=", target: 80, field: "price" });
    expect(evaluateRule(rule, { price: 79 }).triggered).toBe(true);
    expect(evaluateRule(rule, { price: 85 }).triggered).toBe(false);
  });

  it("cross_up needs prev below and curr at/above target", () => {
    const rule = makeRule({ op: "cross_up", target: 100, field: "price" });
    const result = evaluateRule(rule, { price: 102, prevPrice: 98 });
    expect(result.triggered).toBe(true);
    expect(result.reason).toContain("cross up");
    expect(evaluateRule(rule, { price: 102, prevPrice: 101 }).triggered).toBe(false);
    expect(evaluateRule(rule, { price: 95, prevPrice: 98 }).triggered).toBe(false);
  });

  it("cross_down needs prev above and curr at/below target", () => {
    const rule = makeRule({ op: "cross_down", target: 100, field: "price" });
    expect(evaluateRule(rule, { price: 99, prevPrice: 101 }).triggered).toBe(true);
    expect(evaluateRule(rule, { price: 105, prevPrice: 101 }).triggered).toBe(false);
  });

  it("changePct field uses snapshot.changePct or derives from prev", () => {
    const rule = makeRule({ op: ">=", target: 5, field: "changePct" });
    expect(evaluateRule(rule, { price: 110, changePct: 10 }).triggered).toBe(true);
    expect(evaluateRule(rule, { price: 110, prevPrice: 100 }).triggered).toBe(true);
    expect(evaluateRule(rule, { price: 102, prevPrice: 100 }).triggered).toBe(false);
  });
});

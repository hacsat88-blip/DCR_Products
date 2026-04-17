import { describe, expect, it, vi } from "vitest";

import {
  buildDefaultActions,
  type PaletteRouter,
} from "../AppCommandPaletteMount";

function createRouter(): PaletteRouter & { push: ReturnType<typeof vi.fn> } {
  return { push: vi.fn() };
}

describe("AppCommandPaletteMount action registry", () => {
  it("exposes the expected core action ids", () => {
    const router = createRouter();
    const ids = buildDefaultActions(router).map((a) => a.id);
    for (const expected of [
      "snapshot.export",
      "snapshot.import",
      "nav.dashboard",
      "nav.etf",
      "nav.portfolio",
      "nav.backtest",
      "nav.alerts",
      "portfolio.addHolding",
      "backtest.runSample",
      "alerts.evaluateNow",
      "theme.reset",
    ]) {
      expect(ids).toContain(expected);
    }
  });

  it("nav actions call router.push with the expected path", () => {
    const router = createRouter();
    const actions = buildDefaultActions(router);
    const nav = actions.find((a) => a.id === "nav.alerts");
    expect(nav).toBeDefined();
    nav?.onSelect();
    expect(router.push).toHaveBeenCalledWith("/alerts");
  });

  it("portfolio.addHolding navigates to /portfolio and dispatches portfolio:open-add", async () => {
    vi.useFakeTimers();
    const router = createRouter();
    const listener = vi.fn();
    window.addEventListener("portfolio:open-add", listener);

    const actions = buildDefaultActions(router);
    const addHolding = actions.find((a) => a.id === "portfolio.addHolding");
    addHolding?.onSelect();

    expect(router.push).toHaveBeenCalledWith("/portfolio");
    expect(listener).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener("portfolio:open-add", listener);
    vi.useRealTimers();
  });

  it("snapshot export/import actions are registered under the data section", () => {
    const router = createRouter();
    const actions = buildDefaultActions(router);
    const exp = actions.find((a) => a.id === "snapshot.export");
    const imp = actions.find((a) => a.id === "snapshot.import");
    expect(exp?.section).toBe("データ");
    expect(imp?.section).toBe("データ");
  });

  it("backtest.runSample and alerts.evaluateNow emit their follow-up events", () => {
    vi.useFakeTimers();
    const router = createRouter();
    const runListener = vi.fn();
    const evalListener = vi.fn();
    window.addEventListener("backtest:run-sample", runListener);
    window.addEventListener("alerts:evaluate-now", evalListener);

    const actions = buildDefaultActions(router);
    actions.find((a) => a.id === "backtest.runSample")?.onSelect();
    actions.find((a) => a.id === "alerts.evaluateNow")?.onSelect();
    vi.runAllTimers();

    expect(runListener).toHaveBeenCalledTimes(1);
    expect(evalListener).toHaveBeenCalledTimes(1);

    window.removeEventListener("backtest:run-sample", runListener);
    window.removeEventListener("alerts:evaluate-now", evalListener);
    vi.useRealTimers();
  });
});

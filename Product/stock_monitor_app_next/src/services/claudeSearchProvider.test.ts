import { afterEach, describe, expect, it, vi } from "vitest";

import { searchStocksWithClaudeFallback } from "./claudeSearchProvider";

describe("searchStocksWithClaudeFallback", () => {
  afterEach(() => {
    delete (globalThis as typeof globalThis & { __STOCK_MONITOR_CLAUDE_SEARCH__?: unknown }).__STOCK_MONITOR_CLAUDE_SEARCH__;
    vi.restoreAllMocks();
  });

  it("returns catalog matches without external search APIs", async () => {
    const payload = await searchStocksWithClaudeFallback("トヨタ");

    expect(payload.error).toBeNull();
    expect(payload.results[0]).toMatchObject({
      code: "7203",
      name: "トヨタ自動車",
      source: "catalog",
    });
  });

  it("falls back to catalog search when Claude runner fails", async () => {
    (globalThis as typeof globalThis & { __STOCK_MONITOR_CLAUDE_SEARCH__?: unknown }).__STOCK_MONITOR_CLAUDE_SEARCH__ =
      vi.fn().mockRejectedValue(new Error("Claude unavailable"));

    const payload = await searchStocksWithClaudeFallback("三菱UFJ", {
      registeredCodes: ["8306"],
    });

    expect(payload.error).toContain("Claude unavailable");
    expect(payload.results[0]).toMatchObject({
      code: "8306",
      source: "registered",
      isRegistered: true,
    });
  });

  it("falls back to catalog when claude hook throws non-Error reason", async () => {
    (globalThis as typeof globalThis & { __STOCK_MONITOR_CLAUDE_SEARCH__?: unknown }).__STOCK_MONITOR_CLAUDE_SEARCH__ =
      vi.fn().mockRejectedValue("claude unavailable");

    const payload = await searchStocksWithClaudeFallback("トヨタ");

    expect(payload.error).toContain("claude unavailable");
    expect(payload.results.length).toBeGreaterThan(0);
    expect(payload.results[0]?.source).toBe("catalog");
  });

  it("falls back to catalog when claude hook returns an empty result set", async () => {
    (globalThis as typeof globalThis & { __STOCK_MONITOR_CLAUDE_SEARCH__?: unknown }).__STOCK_MONITOR_CLAUDE_SEARCH__ =
      vi.fn().mockResolvedValue([]);

    const payload = await searchStocksWithClaudeFallback("トヨタ");

    expect(payload.error).toBeNull();
    expect(payload.results.length).toBeGreaterThan(0);
    expect(payload.results[0]?.source).toBe("catalog");
  });
});

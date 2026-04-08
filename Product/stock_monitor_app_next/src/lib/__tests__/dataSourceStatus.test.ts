import { describe, expect, it } from "vitest";

import type { ProviderHealth } from "@/services/providers/types";
import { resolveDataSourceStatus } from "@/lib/dataSourceStatus";

function createHealth(
  provider: ProviderHealth["provider"],
  ok: boolean,
  message: string | null = null
): ProviderHealth {
  return {
    provider,
    ok,
    message,
    errorCode: ok ? null : "network",
    latencyMs: ok ? 120 : null,
    fetchedAt: "2026-04-07T00:00:00.000Z",
    sourceTimestamp: ok ? "2026-04-07T00:00:00.000Z" : null,
    sourceLabel: ok ? "YF" : null,
    cumulativeCalls: provider === "alphaVantage" ? 0 : null,
  };
}

describe("resolveDataSourceStatus", () => {
  it("returns mock for intentional mock mode without hard error", () => {
    const status = resolveDataSourceStatus({
      dataMode: "mock",
      sourceMeta: { overall: "M", price: "M", fundamentals: "M" },
      health: [
        createHealth("yahoo", false, "live mode disabled"),
        createHealth("alphaVantage", false, "live mode disabled"),
      ],
      error: null,
    });

    expect(status).toBe("mock");
  });

  it("returns error when mock mode has runtime failure", () => {
    const status = resolveDataSourceStatus({
      dataMode: "mock",
      sourceMeta: { overall: "M", price: "M", fundamentals: "M" },
      health: [createHealth("yahoo", false, "request failed")],
      error: "実データ取得に失敗しました",
    });

    expect(status).toBe("error");
  });

  it("returns fallback when alpha fallback was used", () => {
    const status = resolveDataSourceStatus({
      dataMode: "live",
      sourceMeta: { overall: "C", price: "C", fundamentals: "C" },
      health: [
        createHealth("yahoo", true),
        createHealth("alphaVantage", true, "fallback used"),
      ],
      error: null,
    });

    expect(status).toBe("fallback");
  });

  it("returns error when all price providers are down", () => {
    const status = resolveDataSourceStatus({
      dataMode: "live",
      sourceMeta: { overall: "M", price: "M", fundamentals: "M" },
      health: [
        createHealth("yahoo", false, "timeout"),
        createHealth("alphaVantage", false, "rate limit"),
        createHealth("jquants", false, "unauthorized"),
      ],
      error: null,
    });

    expect(status).toBe("error");
  });
});

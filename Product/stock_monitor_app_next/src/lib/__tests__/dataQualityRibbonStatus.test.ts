import { describe, expect, it } from "vitest";

import { resolveSessionStateLabel, resolveUpdateStateLabel } from "../dataQualityRibbonStatus";

describe("dataQualityRibbonStatus", () => {
  it("returns trading session label during morning session", () => {
    expect(resolveSessionStateLabel("morning")).toBe("取引中");
  });

  it("returns out-of-session label after close", () => {
    expect(resolveSessionStateLabel("after_close")).toBe("時間外");
  });

  it("returns mock update state when data mode is mock", () => {
    expect(
      resolveUpdateStateLabel({
        dataMode: "mock",
        lastUpdatedAt: "2024-01-15T00:00:00Z",
        session: "morning",
      })
    ).toBe("モック");
  });

  it("returns end-of-day update state outside trading hours", () => {
    expect(
      resolveUpdateStateLabel({
        dataMode: "live",
        lastUpdatedAt: "2024-01-15T06:00:00Z",
        session: "after_close",
      })
    ).toBe("終値ベース");
  });

  it("returns realtime-equivalent for fresh live data in trading session", () => {
    const now = new Date("2024-01-15T01:10:00Z");
    expect(
      resolveUpdateStateLabel({
        dataMode: "live",
        lastUpdatedAt: "2024-01-15T01:02:00Z",
        session: "morning",
        now,
      })
    ).toBe("リアルタイム相当");
  });

  it("returns delayed for stale live data in trading session", () => {
    const now = new Date("2024-01-15T01:20:00Z");
    expect(
      resolveUpdateStateLabel({
        dataMode: "live",
        lastUpdatedAt: "2024-01-15T01:00:00Z",
        session: "morning",
        now,
      })
    ).toBe("遅延");
  });

  it("returns delayed for fallback data in trading session", () => {
    expect(
      resolveUpdateStateLabel({
        dataMode: "fallback",
        lastUpdatedAt: "2024-01-15T01:00:00Z",
        session: "morning",
      })
    ).toBe("遅延");
  });
});


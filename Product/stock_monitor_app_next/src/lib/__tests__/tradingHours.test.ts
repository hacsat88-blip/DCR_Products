import { describe, expect, it } from "vitest";

import {
  formatTokyoMarketSessionLabel,
  getTokyoMarketSession,
  isTokyoTradingHours,
  resolveDefaultNikkeiTimeframe,
} from "../tradingHours";

describe("tradingHours", () => {
  it("treats weekday morning in JST as trading hours", () => {
    const reference = new Date("2024-01-15T01:00:00Z");

    expect(getTokyoMarketSession(reference)).toBe("morning");
    expect(isTokyoTradingHours(reference)).toBe(true);
    expect(resolveDefaultNikkeiTimeframe(reference)).toBe("5m");
  });

  it("detects lunch break as non-trading time", () => {
    const reference = new Date("2024-01-15T03:00:00Z");

    expect(getTokyoMarketSession(reference)).toBe("lunch_break");
    expect(isTokyoTradingHours(reference)).toBe(false);
  });

  it("falls back to daily view after the close", () => {
    const reference = new Date("2024-01-15T06:45:00Z");

    expect(getTokyoMarketSession(reference)).toBe("after_close");
    expect(resolveDefaultNikkeiTimeframe(reference)).toBe("1d");
  });

  it("labels weekends as market holidays", () => {
    const reference = new Date("2024-01-13T01:00:00Z");

    expect(getTokyoMarketSession(reference)).toBe("weekend");
    expect(formatTokyoMarketSessionLabel("weekend")).toBe("休場");
  });
});

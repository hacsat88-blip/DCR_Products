import { describe, it, expect } from "vitest";

import {
  normalizeJpRange,
  isJpCodeInRange,
  formatJpCode,
  parseJpCode,
  normalizeUsRange,
  isUsTickerInRange,
  compareAlpha,
} from "@/lib/tickerRange";

describe("tickerRange — JP", () => {
  it("clamps and reorders a JP range", () => {
    const range = normalizeJpRange({ start: 9999, end: 1000 });
    expect(range).toEqual({ start: 1000, end: 9999 });
  });

  it("detects membership inclusively", () => {
    const range = normalizeJpRange({ start: 7000, end: 8000 });
    expect(isJpCodeInRange("7203", range)).toBe(true);
    expect(isJpCodeInRange(8000, range)).toBe(true);
    expect(isJpCodeInRange("6000", range)).toBe(false);
  });

  it("formats and parses", () => {
    expect(formatJpCode(203)).toBe("0203");
    expect(parseJpCode("  7203.T ")).toBe(7203);
    expect(parseJpCode("abc")).toBeNull();
  });
});

describe("tickerRange — US", () => {
  it("compares lexicographically with shorter-first", () => {
    expect(compareAlpha("AA", "AAA")).toBe(-1);
    expect(compareAlpha("AB", "AAA")).toBe(1);
  });

  it("orders start/end and bounds length", () => {
    const range = normalizeUsRange({ minLength: 1, maxLength: 10, alphaStart: "ZZ", alphaEnd: "AA" });
    expect(range.minLength).toBe(1);
    expect(range.maxLength).toBe(6);
    expect(range.alphaStart).toBe("AA");
    expect(range.alphaEnd).toBe("ZZ");
  });

  it("filters by length and alpha window", () => {
    const range = normalizeUsRange({ minLength: 3, maxLength: 4, alphaStart: "QQQ", alphaEnd: "TZZZ" });
    expect(isUsTickerInRange("SPY", range)).toBe(true);
    expect(isUsTickerInRange("TSLA", range)).toBe(true);
    expect(isUsTickerInRange("AAPL", range)).toBe(false); // AAPL < QQQ
    expect(isUsTickerInRange("QQ", range)).toBe(false); // too short
    expect(isUsTickerInRange("BRK.B", range)).toBe(false); // core "BRK" < "QQQ"
  });
});

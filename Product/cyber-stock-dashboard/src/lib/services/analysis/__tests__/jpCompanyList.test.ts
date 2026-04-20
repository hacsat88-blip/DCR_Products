import { describe, it, expect } from "vitest";
import { jpCompanyName, JP_COMPANY_MAP } from "../jpCompanyList";

describe("jpCompanyList", () => {
  it("returns company name for known Nikkei 225 codes", () => {
    expect(jpCompanyName("7203")).toBe("トヨタ自動車");
    expect(jpCompanyName("6758")).toBe("ソニーグループ");
    expect(jpCompanyName("8035")).toBe("東京エレクトロン");
    expect(jpCompanyName("9984")).toBe("ソフトバンクグループ");
    expect(jpCompanyName("6861")).toBe("キーエンス");
  });

  it("returns undefined for unknown codes", () => {
    expect(jpCompanyName("0000")).toBeUndefined();
    expect(jpCompanyName("")).toBeUndefined();
    expect(jpCompanyName("AAPL")).toBeUndefined();
  });

  it("contains 100+ entries", () => {
    expect(Object.keys(JP_COMPANY_MAP).length).toBeGreaterThanOrEqual(100);
  });

  it("all keys are 4-digit strings", () => {
    for (const key of Object.keys(JP_COMPANY_MAP)) {
      expect(key).toMatch(/^\d{4}$/);
    }
  });

  it("all values are non-empty strings", () => {
    for (const value of Object.values(JP_COMPANY_MAP)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

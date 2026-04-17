import { describe, expect, it } from "vitest";
import { detectSymbols, scoreRelevance, stableId } from "../normalize";
import type { NewsItem } from "../types";

describe("detectSymbols", () => {
  it("detects Japanese 4-digit codes", () => {
    expect(detectSymbols("トヨタ自動車(7203)が上昇")).toEqual(["7203"]);
  });

  it("detects US tickers", () => {
    const result = detectSymbols("AAPL and TSLA rally");
    expect(result).toContain("AAPL");
    expect(result).toContain("TSLA");
    expect(result).toHaveLength(2);
  });

  it("excludes stop-list words", () => {
    expect(detectSymbols("THE FED raised rates")).toEqual([]);
  });
});

describe("stableId", () => {
  it("is deterministic for the same url", () => {
    const a = stableId("https://example.com/news/1");
    const b = stableId("https://example.com/news/1");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]+$/);
  });

  it("differs for different urls", () => {
    expect(stableId("https://a.example/1")).not.toBe(stableId("https://a.example/2"));
  });
});

describe("scoreRelevance", () => {
  const makeItem = (overrides: Partial<NewsItem>): NewsItem => ({
    id: "x",
    source: "yahoo-jp",
    region: "JP",
    title: "t",
    url: "https://x",
    summary: null,
    publishedAt: new Date().toISOString(),
    symbols: [],
    language: "ja",
    ...overrides,
  });

  it("ranks fresh + matching symbols higher than stale unrelated", () => {
    const fresh = makeItem({ publishedAt: new Date().toISOString(), symbols: ["7203"] });
    const old = makeItem({
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
      symbols: [],
    });
    expect(scoreRelevance(fresh, ["7203"])).toBeGreaterThan(scoreRelevance(old, ["7203"]));
  });
});

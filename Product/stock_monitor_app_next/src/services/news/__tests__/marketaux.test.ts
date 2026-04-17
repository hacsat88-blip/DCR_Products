import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchMarketaux } from "../sources/marketaux";

describe("fetchMarketaux", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
  });

  it("returns [] when apiKey is empty", async () => {
    const items = await fetchMarketaux("");
    expect(items).toEqual([]);
  });

  it("maps Marketaux response into NewsItem[]", async () => {
    const mockJson = {
      data: [
        {
          uuid: "abc-123",
          title: "Apple beats estimates",
          description: "Revenue up 8% YoY",
          url: "https://example.com/1",
          published_at: "2026-04-17T00:00:00Z",
          language: "en",
          entities: [
            { symbol: "AAPL", sentiment_score: 0.42 },
            { symbol: "MSFT", sentiment_score: 0.2 },
          ],
        },
      ],
    };
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify(mockJson), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    const items = await fetchMarketaux("test-key", {
      symbols: ["AAPL"],
      region: "US",
    });

    expect(items).toHaveLength(1);
    const [it0] = items;
    expect(it0.id).toBe("abc-123");
    expect(it0.source).toBe("marketaux");
    expect(it0.symbols).toContain("AAPL");
    expect(it0.sentiment).toBeCloseTo(0.31, 2);
    expect(it0.region).toBe("US");
  });

  it("returns [] on non-200 response", async () => {
    global.fetch = vi.fn(async () =>
      new Response("nope", { status: 500 }),
    ) as unknown as typeof fetch;
    const items = await fetchMarketaux("test-key");
    expect(items).toEqual([]);
  });
});

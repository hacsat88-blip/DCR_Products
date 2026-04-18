import { describe, it, expect, vi } from "vitest";
import { createMarketauxClient } from "@/lib/providers/marketaux";

function mockResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

describe("createMarketauxClient", () => {
  it("parses news and aggregates symbols + sentiment", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(
      mockResponse({
        data: [
          {
            uuid: "u1",
            title: "Apple beats",
            description: "desc",
            url: "https://example.com/a",
            source: "Example",
            published_at: "2024-05-01T00:00:00Z",
            language: "en",
            entities: [
              { symbol: "AAPL", sentiment_score: 0.8 },
              { symbol: "MSFT", sentiment_score: 0.4 },
            ],
          },
        ],
      }),
    );
    const client = createMarketauxClient({ fetchImpl, apiKey: "K" });
    const items = await client.getNews({ symbols: ["AAPL"], limit: 5 });
    expect(items).toHaveLength(1);
    expect(items[0].symbols).toEqual(["AAPL", "MSFT"]);
    expect(items[0].sentiment).toBeCloseTo(0.6);
    const url = fetchImpl.mock.calls[0][0] as string;
    expect(url).toContain("symbols=AAPL");
    expect(url).toContain("limit=5");
  });

  it("throws on Zod failure", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(mockResponse({ wrong: true }));
    const client = createMarketauxClient({ fetchImpl, apiKey: "K" });
    await expect(client.getNews()).rejects.toThrow();
  });

  it("throws on non-OK response", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(mockResponse({}, false, 500));
    const client = createMarketauxClient({ fetchImpl, apiKey: "K" });
    await expect(client.getNews()).rejects.toThrow(/500/);
  });
});

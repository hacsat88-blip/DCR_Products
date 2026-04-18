import { describe, it, expect, vi } from "vitest";
import { createAlphaVantageClient } from "@/lib/providers/alphaVantage";

function mockResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

describe("createAlphaVantageClient", () => {
  it("parses GLOBAL_QUOTE response", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(
      mockResponse({
        "Global Quote": {
          "01. symbol": "AAPL",
          "05. price": "190.12",
          "07. latest trading day": "2024-05-01",
          "09. change": "1.20",
          "10. change percent": "0.6300%",
        },
      }),
    );
    const client = createAlphaVantageClient({ fetchImpl, apiKey: "K" });
    const q = await client.getQuote("AAPL");
    expect(q.symbol).toBe("AAPL");
    expect(q.price).toBeCloseTo(190.12);
    expect(q.changePercent).toBeCloseTo(0.63);
    expect(q.currency).toBe("USD");
  });

  it("parses TIME_SERIES_DAILY_ADJUSTED into sorted candles", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(
      mockResponse({
        "Time Series (Daily)": {
          "2024-01-05": {
            "1. open": "10",
            "2. high": "12",
            "3. low": "9",
            "4. close": "11",
            "5. adjusted close": "11",
            "6. volume": "1000",
          },
          "2024-01-04": {
            "1. open": "9",
            "2. high": "11",
            "3. low": "8",
            "4. close": "10",
            "5. adjusted close": "10",
            "6. volume": "900",
          },
        },
      }),
    );
    const client = createAlphaVantageClient({ fetchImpl, apiKey: "K" });
    const candles = await client.getDailyAdjusted("AAPL");
    expect(candles.map((c) => c.date)).toEqual(["2024-01-04", "2024-01-05"]);
  });

  it("returns FX rate", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(
      mockResponse({
        "Realtime Currency Exchange Rate": {
          "1. From_Currency Code": "USD",
          "3. To_Currency Code": "JPY",
          "5. Exchange Rate": "151.23",
        },
      }),
    );
    const client = createAlphaVantageClient({ fetchImpl, apiKey: "K" });
    const rate = await client.getFxRate("USD", "JPY");
    expect(rate).toBeCloseTo(151.23);
  });

  it("throws on rate-limit Note response", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(mockResponse({ Note: "Thank you for using" }));
    const client = createAlphaVantageClient({ fetchImpl, apiKey: "K" });
    await expect(client.getQuote("AAPL")).rejects.toThrow(/rate limited/);
  });

  it("throws on Zod validation failure", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(mockResponse({ "Global Quote": {} }));
    const client = createAlphaVantageClient({ fetchImpl, apiKey: "K" });
    await expect(client.getQuote("AAPL")).rejects.toThrow();
  });

  it("returns friendly error when daily series payload shape is unexpected", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(mockResponse({ Information: "demo limit reached" }));
    const client = createAlphaVantageClient({ fetchImpl, apiKey: "K" });
    await expect(client.getDailyAdjusted("AAPL")).rejects.toThrow(
      /AlphaVantage info/,
    );
  });

  it("does not leak zod internals when daily series key is missing", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(mockResponse({ "Meta Data": {} }));
    const client = createAlphaVantageClient({ fetchImpl, apiKey: "K" });
    const err = await client
      .getDailyAdjusted("AAPL")
      .then(() => null, (e) => e);
    const message = err instanceof Error ? err.message : String(err);
    expect(message).toMatch(/daily data unavailable/);
    expect(message).not.toMatch(/invalid_type/);
  });
});

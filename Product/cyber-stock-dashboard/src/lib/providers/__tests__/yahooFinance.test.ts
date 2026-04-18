import { describe, it, expect, vi } from "vitest";
import {
  createYahooFinanceClient,
  normalizeYahooSymbol,
} from "@/lib/providers/yahooFinance";

function mockResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("normalizeYahooSymbol", () => {
  it("adds .T suffix for JP numeric symbols", () => {
    expect(normalizeYahooSymbol("7203", "jp")).toBe("7203.T");
  });

  it("does not duplicate .T suffix", () => {
    expect(normalizeYahooSymbol("7203.T", "jp")).toBe("7203.T");
  });
});

describe("createYahooFinanceClient", () => {
  it("parses chart response into candles", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(
      mockResponse({
        chart: {
          result: [
            {
              timestamp: [1704067200, 1704153600],
              indicators: {
                quote: [
                  {
                    open: [100, 101],
                    high: [110, 112],
                    low: [95, 99],
                    close: [108, 111],
                    volume: [1000, 1100],
                  },
                ],
                adjclose: [{ adjclose: [107.5, 110.5] }],
              },
            },
          ],
          error: null,
        },
      }),
    );
    const client = createYahooFinanceClient({
      fetchImpl,
      now: () => Date.parse("2025-01-15T00:00:00Z"),
    });

    const candles = await client.getDailyCandles("AAPL", { market: "us" });

    expect(candles).toHaveLength(2);
    expect(candles[0].date).toBe("2024-01-01");
    expect(candles[0].adjustedClose).toBeCloseTo(107.5);
    expect(candles[1].close).toBeCloseTo(111);
  });

  it("uses normalized JP symbol in chart request URL", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(
      mockResponse({
        chart: {
          result: [
            {
              timestamp: [1704067200],
              indicators: {
                quote: [
                  {
                    open: [100],
                    high: [101],
                    low: [99],
                    close: [100.5],
                    volume: [500],
                  },
                ],
              },
            },
          ],
          error: null,
        },
      }),
    );
    const client = createYahooFinanceClient({
      fetchImpl,
      now: () => Date.parse("2025-01-15T00:00:00Z"),
    });

    await client.getDailyCandles("7203", { market: "jp", days: 30 });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const url = fetchImpl.mock.calls[0][0] as string;
    expect(url).toContain("/chart/7203.T?");
  });

  it("throws a clean error for Yahoo chart error payload", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(
      mockResponse({
        chart: {
          result: null,
          error: { code: "Not Found", description: "No data found" },
        },
      }),
    );
    const client = createYahooFinanceClient({ fetchImpl });

    await expect(client.getDailyCandles("NOPE")).rejects.toThrow(
      /Yahoo Finance error/i,
    );
  });

  it("throws when chart result payload is missing", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(
      mockResponse({
        chart: { result: null, error: null },
      }),
    );
    const client = createYahooFinanceClient({ fetchImpl });

    await expect(client.getDailyCandles("AAPL")).rejects.toThrow(
      /missing chart result/i,
    );
  });
});

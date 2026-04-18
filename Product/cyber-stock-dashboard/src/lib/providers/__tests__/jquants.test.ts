import { describe, it, expect, vi } from "vitest";
import { createJQuantsClient } from "@/lib/providers/jquants";

function mockResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("createJQuantsClient", () => {
  it("uses API key mode (V2) and parses bars data", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(
      mockResponse({
        data: [
          {
            Date: "2024-01-04",
            Code: "7203",
            O: 100,
            H: 110,
            L: 95,
            C: 105,
            Vo: 1000,
            AdjC: 105,
          },
          {
            Date: "2024-01-05",
            Code: "7203",
            O: null,
            H: null,
            L: null,
            C: null,
            Vo: null,
          },
        ],
      }),
    );
    const client = createJQuantsClient({
      fetchImpl,
      apiKey: "API-KEY",
      refreshToken: "rt",
    });
    const candles = await client.getDailyQuotes(
      "7203",
      "2024-01-01",
      "2024-01-31",
    );

    expect(candles).toHaveLength(1);
    expect(candles[0].close).toBe(105);
    expect(candles[0].adjustedClose).toBe(105);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url as string).toContain("/v2/equities/bars/daily");
    expect(init).toMatchObject({
      headers: { "x-api-key": "API-KEY" },
    });
  });

  it("uses API key mode (V2) for listed master and caches it", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(
      mockResponse({
        data: [{ Code: "7203", CompanyName: "トヨタ自動車" }],
      }),
    );
    const client = createJQuantsClient({ fetchImpl, apiKey: "API-KEY" });
    const a = await client.getListedInfo();
    const b = await client.getListedInfo();

    expect(a).toHaveLength(1);
    expect(a[0].Code).toBe("7203");
    expect(b).toEqual(a);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const url = fetchImpl.mock.calls[0][0] as string;
    expect(url).toContain("/v2/equities/master");
  });

  it("falls back to legacy refresh-token mode when API key is absent", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(mockResponse({ idToken: "ID-1" }))
      .mockResolvedValueOnce(
        mockResponse({
          daily_quotes: [
            {
              Date: "2024-01-04",
              Code: "7203",
              Open: 100,
              High: 110,
              Low: 95,
              Close: 105,
              Volume: 1000,
              AdjustmentClose: 105,
            },
          ],
        }),
      );
    const client = createJQuantsClient({ fetchImpl, refreshToken: "rt" });
    const candles = await client.getDailyQuotes(
      "7203",
      "2024-01-01",
      "2024-01-31",
    );

    expect(candles).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const authUrl = fetchImpl.mock.calls[0][0] as string;
    expect(authUrl).toContain("/v1/token/auth_refresh");
    expect(authUrl).toContain("refreshtoken=rt");
    const [dailyUrl, dailyInit] = fetchImpl.mock.calls[1];
    expect(dailyUrl as string).toContain("/v1/prices/daily_quotes");
    expect(dailyInit).toMatchObject({
      headers: { Authorization: "Bearer ID-1" },
    });
  });

  it("throws on invalid auth response (legacy mode)", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(mockResponse({ wrong: true }));
    const client = createJQuantsClient({
      fetchImpl,
      refreshToken: "rt",
    });
    await expect(client.getIdToken()).rejects.toThrow();
  });

  it("throws on non-OK auth response (legacy mode)", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(mockResponse({}, false, 401));
    const client = createJQuantsClient({
      fetchImpl,
      refreshToken: "rt",
    });
    await expect(client.getIdToken()).rejects.toThrow(/401/);
  });
});

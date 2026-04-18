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
  it("fetches an id token and caches it", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(mockResponse({ idToken: "ID-1" }));
    const client = createJQuantsClient({
      fetchImpl,
      refreshToken: "rt",
    });
    const a = await client.getIdToken();
    const b = await client.getIdToken();
    expect(a).toBe("ID-1");
    expect(b).toBe("ID-1");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const url = fetchImpl.mock.calls[0][0] as string;
    expect(url).toContain("auth_refresh");
    expect(url).toContain("refreshtoken=rt");
  });

  it("parses daily quotes into Candles", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(mockResponse({ idToken: "ID" }))
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
            {
              Date: "2024-01-05",
              Code: "7203",
              Open: null,
              High: null,
              Low: null,
              Close: null,
              Volume: null,
            },
          ],
        }),
      );
    const client = createJQuantsClient({
      fetchImpl,
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
  });

  it("throws on invalid auth response (Zod failure)", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(mockResponse({ wrong: true }));
    const client = createJQuantsClient({
      fetchImpl,
      refreshToken: "rt",
    });
    await expect(client.getIdToken()).rejects.toThrow();
  });

  it("throws on non-OK auth response", async () => {
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

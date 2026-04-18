import { describe, it, expect, vi } from "vitest";
import { createEdinetDbClient } from "@/lib/providers/edinetdb";

function mockResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

describe("createEdinetDbClient", () => {
  it("filters disclosures by secCode across recent days", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        mockResponse({
          results: [
            {
              docID: "D1",
              secCode: "72030",
              filerName: "Toyota",
              docDescription: "有報",
              docTypeCode: "120",
              submitDateTime: "2024-05-01 09:00",
            },
            {
              docID: "D2",
              secCode: "99990",
              filerName: "Other",
              docDescription: "ignored",
              submitDateTime: "2024-05-01 10:00",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(mockResponse({ results: [] }));

    const client = createEdinetDbClient({
      fetchImpl,
      apiKey: "K",
      now: () => new Date("2024-05-02T00:00:00Z"),
    });
    const items = await client.getRecentDisclosures("7203", 2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(items).toHaveLength(1);
    expect(items[0].docId).toBe("D1");
    expect(items[0].code).toBe("72030");
    expect(items[0].title).toBe("有報");
  });

  it("throws on Zod failure", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(mockResponse({ results: [{ noDocId: true }] }));
    const client = createEdinetDbClient({
      fetchImpl,
      apiKey: "K",
      now: () => new Date("2024-05-02T00:00:00Z"),
    });
    await expect(client.getRecentDisclosures("7203", 1)).rejects.toThrow();
  });
});

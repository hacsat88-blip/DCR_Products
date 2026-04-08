import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "./route";

const ORIGINAL_BASE_URL = process.env.EDINET_DB_BASE_URL;

function buildRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/stock-search?q=${encodeURIComponent(query)}`);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (ORIGINAL_BASE_URL == null) {
    delete process.env.EDINET_DB_BASE_URL;
  } else {
    process.env.EDINET_DB_BASE_URL = ORIGINAL_BASE_URL;
  }
});

describe("GET /api/stock-search", () => {
  it("generates company overview and summary from industry-level search rows", async () => {
    process.env.EDINET_DB_BASE_URL = "https://example.test";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              {
                sec_code: "99990",
                company_name: "テストHD",
                industry: "半導体"
              }
            ]
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );

    const response = await GET(buildRequest("9999"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.error).toBeNull();
    expect(payload.results).toHaveLength(1);
    expect(payload.results[0]).toMatchObject({
      code: "9999",
      name: "テストHD",
      sector: "半導体"
    });
    expect(payload.results[0].oneLiner).toContain("テストHD");
    expect(payload.results[0].oneLiner).toContain("半導体");
    expect(payload.results[0].summary).toContain("テストHD");
    expect(payload.results[0].summary).toContain("半導体");
  });

  it("prefers description-like fields when search rows include business text", async () => {
    process.env.EDINET_DB_BASE_URL = "https://example.test";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            items: [
              {
                sec_code: "77770",
                filer_name: "説明銘柄",
                industry: "SaaS",
                description: "法人向けSaaSを提供し、継続課金で収益を積み上げる。"
              }
            ]
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );

    const response = await GET(buildRequest("7777"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.results).toHaveLength(1);
    expect(payload.results[0].oneLiner).toContain("法人向けSaaS");
    expect(payload.results[0].summary).toContain("継続課金");
    expect(payload.results[0].summary).toContain("説明銘柄");
  });
});

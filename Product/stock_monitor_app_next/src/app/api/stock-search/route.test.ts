import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "./route";

function buildRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/stock-search?q=${encodeURIComponent(query)}`);
}

describe("GET /api/stock-search", () => {
  it("returns local catalog results without external search APIs", async () => {
    const response = await GET(buildRequest("トヨタ"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.error).toBeNull();
    expect(payload.results[0]).toMatchObject({
      code: "7203",
      name: "トヨタ自動車",
      source: "catalog",
    });
  });

  it("marks default registered stocks as registered in route results", async () => {
    const response = await GET(buildRequest("日本通信"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.results[0]).toMatchObject({
      code: "9424",
      source: "registered",
      isRegistered: true,
    });
  });

  it("returns 400 for validation errors when the query is too short", async () => {
    const response = await GET(buildRequest("a"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      results: [],
      error: "検索文字数は2文字以上で入力してください。",
    });
  });
});

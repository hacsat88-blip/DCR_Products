import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchAllNewsMock = vi.fn();
const fetchAllRssMock = vi.fn();

vi.mock("@/lib/services/news/aggregator", () => ({
  fetchAllNews: (...args: unknown[]) => fetchAllNewsMock(...args),
}));

vi.mock("@/lib/services/news/rssFetcher", () => ({
  fetchAllRss: (...args: unknown[]) => fetchAllRssMock(...args),
}));

import { GET } from "@/app/api/news/route";

const sampleNewsItem = {
  id: "news:1",
  title: "Sample",
  url: "https://example.com/news-1",
  source: "rss",
  publishedAt: "2026-04-18T08:00:00.000Z",
  symbols: [],
};

describe("/api/news route", () => {
  beforeEach(() => {
    fetchAllNewsMock.mockReset();
    fetchAllRssMock.mockReset();
  });

  it("returns aggregated news on success", async () => {
    fetchAllNewsMock.mockResolvedValueOnce([sampleNewsItem]);
    const res = await GET(new Request("http://localhost/api/news?limit=12"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(1);
    expect(body.items[0].id).toBe("news:1");
    expect(body.fallback).toBeUndefined();
  });

  it("returns RSS fallback payload when primary fetch fails", async () => {
    fetchAllNewsMock.mockRejectedValueOnce(new Error("marketaux timeout"));
    fetchAllRssMock.mockResolvedValueOnce([sampleNewsItem]);
    const res = await GET(new Request("http://localhost/api/news?limit=5"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fallback).toBe(true);
    expect(body.count).toBe(1);
    expect(body.warning).toContain("news_partial_fallback");
    expect(body.warning).toContain("marketaux timeout");
  });

  it("returns consistent 502 error when both primary and RSS fallback fail", async () => {
    fetchAllNewsMock.mockRejectedValueOnce(new Error("primary failed"));
    fetchAllRssMock.mockRejectedValueOnce(new Error("rss failed"));
    const res = await GET(new Request("http://localhost/api/news"));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("news_fetch_failed");
    expect(body.detail).toContain("primary failed");
    expect(body.detail).toContain("rss_fallback_failed");
  });
});


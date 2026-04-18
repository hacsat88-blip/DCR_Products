import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTestDb } from "@/lib/db/__tests__/helper";
import { upsertManyNews } from "@/lib/db/repositories/newsCacheRepo";
import { fetchAllNews, dedupeNews, CACHE_TTL_MS } from "../aggregator";
import type { NewsItem } from "@/lib/providers/types";
import type { NewsSummary } from "@/lib/llm/schemas";

const ORIGINAL_KEY = process.env.OPENROUTER_API_KEY;
const ORIGINAL_MX = process.env.MARKETAUX_API_KEY;

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "sk-test";
  process.env.MARKETAUX_API_KEY = "mx-test";
});
afterEach(() => {
  process.env.OPENROUTER_API_KEY = ORIGINAL_KEY;
  process.env.MARKETAUX_API_KEY = ORIGINAL_MX;
});

function mkItem(over: Partial<NewsItem> = {}): NewsItem {
  return {
    id: "src:1",
    title: "title",
    url: "https://x.test/1",
    source: "src",
    publishedAt: new Date().toISOString(),
    symbols: [],
    ...over,
  };
}

describe("aggregator.dedupeNews", () => {
  it("removes by URL and normalized title", () => {
    const items = [
      mkItem({ id: "a:1", url: "https://x.test/1?utm=1", title: "Tech rally" }),
      mkItem({ id: "b:1", url: "https://x.test/1?utm=2", title: "Tech rally x" }),
      mkItem({ id: "c:1", url: "https://other.test/1", title: "  TECH RALLY  " }),
      mkItem({ id: "d:1", url: "https://other.test/2", title: "Different" }),
    ];
    const out = dedupeNews(items);
    expect(out).toHaveLength(2);
    expect(out.map((o) => o.id)).toContain("a:1");
    expect(out.map((o) => o.id)).toContain("d:1");
  });
});

describe("aggregator.fetchAllNews", () => {
  it("returns cached rows on cache hit (within TTL)", async () => {
    const db = createTestDb() as never;
    const now = Date.now();
    upsertManyNews(db as never, [
      {
        source: "marketaux",
        externalId: "cached-1",
        url: "https://cached.test/1",
        title: "cached news",
        summary: "cached summary",
        publishedAt: new Date(now - 1000),
        fetchedAt: new Date(now - 5 * 60 * 1000),
      },
    ]);

    const summarize = vi.fn();
    const fetchRss = vi.fn(async () => []);
    const marketauxClient = { getNews: vi.fn(async () => []) };

    const items = await fetchAllNews(
      { limit: 10 },
      {
        db,
        marketauxClient,
        fetchRss,
        summarize: summarize as never,
        now: () => now,
      },
    );
    expect(items).toHaveLength(1);
    expect(items[0].summary).toBe("cached summary");
    expect(summarize).not.toHaveBeenCalled();
    expect(fetchRss).not.toHaveBeenCalled();
    expect(marketauxClient.getNews).not.toHaveBeenCalled();
  });

  it("on cache miss fetches marketaux+rss, dedupes, summarizes, persists", async () => {
    const db = createTestDb() as never;
    const now = Date.now();

    const marketauxItems: NewsItem[] = [
      mkItem({
        id: "mx:a",
        url: "https://news.test/a",
        title: "Apple earnings beat",
        source: "marketaux",
        publishedAt: new Date(now - 1000).toISOString(),
      }),
    ];
    const rssItems: NewsItem[] = [
      mkItem({
        id: "rss:a",
        url: "https://news.test/a?ref=rss",
        title: "Apple earnings beat",
        source: "yahoo-finance-us",
        publishedAt: new Date(now - 500).toISOString(),
      }),
      mkItem({
        id: "rss:b",
        url: "https://news.test/b",
        title: "Toyota EV plan",
        source: "nhk-business",
        publishedAt: new Date(now - 200).toISOString(),
      }),
    ];

    const summary: NewsSummary = {
      items: [
        {
          title: "Apple earnings beat",
          summary: "アップルの決算が市場予想を上回った（推定）。",
          sentiment: "positive",
          sectors: ["テクノロジー"],
        },
        {
          title: "Toyota EV plan",
          summary: "トヨタがEV戦略を発表（推定）。",
          sentiment: "neutral",
          sectors: ["自動車"],
        },
      ],
    };
    const summarize = vi.fn(async () => summary);
    const marketauxClient = { getNews: vi.fn(async () => marketauxItems) };
    const fetchRss = vi.fn(async () => rssItems);

    const items = await fetchAllNews(
      { limit: 10 },
      {
        db,
        marketauxClient,
        fetchRss,
        summarize: summarize as never,
        now: () => now,
      },
    );

    expect(marketauxClient.getNews).toHaveBeenCalledOnce();
    expect(fetchRss).toHaveBeenCalledOnce();
    expect(summarize).toHaveBeenCalledOnce();
    // dedupe: 2 unique
    expect(items).toHaveLength(2);
    const apple = items.find((i) => i.title.includes("Apple"));
    expect(apple?.summary).toContain("アップル");
    expect(apple?.sentimentLabel).toBe("positive");
    expect(apple?.sectors).toContain("テクノロジー");

    // persisted -> next call should be cache-hit
    const cached = await fetchAllNews(
      { limit: 10 },
      {
        db,
        marketauxClient: { getNews: vi.fn(async () => []) },
        fetchRss: vi.fn(async () => []),
        summarize: vi.fn() as never,
        now: () => now,
      },
    );
    expect(cached.length).toBeGreaterThan(0);
  });

  it("falls back to title when LLM summarization throws", async () => {
    const db = createTestDb() as never;
    const now = Date.now();
    const items: NewsItem[] = [
      mkItem({ id: "rss:1", url: "https://x.test/1", title: "News A" }),
    ];
    const summarize = vi.fn(async () => {
      throw new Error("LLM down");
    });
    const result = await fetchAllNews(
      { limit: 10 },
      {
        db,
        marketauxClient: { getNews: vi.fn(async () => []) },
        fetchRss: async () => items,
        summarize: summarize as never,
        now: () => now,
      },
    );
    expect(result).toHaveLength(1);
    expect(result[0].summary).toBe("News A");
  });

  it("treats stale cache as miss (fetchedAt older than TTL)", async () => {
    const db = createTestDb() as never;
    const now = Date.now();
    upsertManyNews(db as never, [
      {
        source: "x",
        externalId: "old",
        url: "https://old.test/1",
        title: "old",
        summary: "old summary",
        publishedAt: new Date(now - CACHE_TTL_MS * 2),
        fetchedAt: new Date(now - CACHE_TTL_MS * 2),
      },
    ]);
    const fetchRss = vi.fn(async () => [
      mkItem({ id: "rss:new", url: "https://new.test/1", title: "fresh" }),
    ]);
    const result = await fetchAllNews(
      { limit: 10 },
      {
        db,
        marketauxClient: { getNews: vi.fn(async () => []) },
        fetchRss,
        summarize: vi.fn(async () => ({
          items: [
            {
              title: "fresh",
              summary: "新着ニュース（推定）。",
              sentiment: "neutral",
              sectors: [],
            },
          ],
        })) as never,
        now: () => now,
      },
    );
    expect(fetchRss).toHaveBeenCalled();
    expect(result.find((i) => i.title === "fresh")).toBeTruthy();
  });

  it("skips marketaux when MARKETAUX_API_KEY is missing and no client passed", async () => {
    delete process.env.MARKETAUX_API_KEY;
    const db = createTestDb() as never;
    const now = Date.now();
    const fetchRss = vi.fn(async () => [
      mkItem({ id: "rss:1", url: "https://x.test/1", title: "rss only" }),
    ]);
    const result = await fetchAllNews(
      { limit: 5 },
      {
        db,
        // marketauxClient omitted on purpose
        fetchRss,
        summarize: vi.fn(async () => ({
          items: [
            {
              title: "rss only",
              summary: "RSS のみ取得（推定）。",
              sentiment: "neutral",
              sectors: [],
            },
          ],
        })) as never,
        now: () => now,
      },
    );
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("rss only");
  });
});

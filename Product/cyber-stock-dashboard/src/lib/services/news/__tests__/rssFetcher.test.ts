import { describe, it, expect, vi } from "vitest";
import { fetchRssSource } from "../rssFetcher";
import type { RssSource } from "../sources";

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Sample Feed</title>
  <link>https://example.com/</link>
  <description>sample</description>
  <item>
    <title>Tech stocks rally on AI optimism</title>
    <link>https://example.com/news/1</link>
    <guid isPermaLink="false">item-1</guid>
    <pubDate>Mon, 06 Jan 2025 09:00:00 GMT</pubDate>
    <description>AI driven rally lifts US tech.</description>
  </item>
  <item>
    <title>Yen weakens past 158 against dollar</title>
    <link>https://example.com/news/2</link>
    <guid isPermaLink="false">item-2</guid>
    <pubDate>Mon, 06 Jan 2025 10:30:00 GMT</pubDate>
    <description>BoJ stance noted by traders.</description>
  </item>
</channel></rss>`;

const source: RssSource = {
  id: "test-source",
  name: "Test Feed",
  url: "https://example.com/feed.xml",
  lang: "en",
  market: "US",
};

describe("rssFetcher.fetchRssSource", () => {
  it("parses RSS XML into NewsItem[]", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(SAMPLE_XML, {
          status: 200,
          headers: { "content-type": "application/rss+xml" },
        }),
    );
    const items = await fetchRssSource(source, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(items).toHaveLength(2);
    expect(items[0].title).toContain("Tech stocks");
    expect(items[0].url).toBe("https://example.com/news/1");
    expect(items[0].source).toBe("test-source");
    expect(items[0].language).toBe("en");
    expect(typeof items[0].publishedAt).toBe("string");
    expect(items[0].id).toContain("test-source");
  });

  it("throws on HTTP error", async () => {
    const fetchImpl = vi.fn(async () => new Response("oops", { status: 500 }));
    await expect(
      fetchRssSource(source, {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/HTTP 500/);
  });
});

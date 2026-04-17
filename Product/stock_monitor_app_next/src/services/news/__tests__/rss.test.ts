import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetRateLimiter } from "@/lib/rateLimiter";
import { fetchRssFeed } from "../sources/rss";

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Sample</title>
    <item>
      <title>トヨタ &amp; ホンダ (7203) 上昇</title>
      <link>https://example.com/a</link>
      <description>本日の市場 &lt;b&gt;概況&lt;/b&gt;</description>
      <pubDate>Tue, 01 Oct 2024 09:00:00 +0900</pubDate>
    </item>
    <item>
      <title>AAPL hits new high</title>
      <link>https://example.com/b</link>
      <description>Apple &quot;rally&quot;</description>
      <pubDate>Tue, 01 Oct 2024 10:00:00 +0900</pubDate>
    </item>
    <item>
      <title>GDP &#39;growth&#39; slows</title>
      <link>https://example.com/c</link>
      <description>Macro &#65;lpha</description>
      <pubDate>invalid-date</pubDate>
    </item>
    <item>
      <title><![CDATA[ソニー(6758)決算]]></title>
      <link>https://example.com/d</link>
      <description><![CDATA[好調な<span>決算</span>]]></description>
      <pubDate>Wed, 02 Oct 2024 08:00:00 +0900</pubDate>
    </item>
  </channel>
</rss>`;

describe("fetchRssFeed", () => {
  beforeEach(() => {
    __resetRateLimiter();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(SAMPLE_RSS, {
          status: 200,
          headers: { "content-type": "application/rss+xml" },
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("parses and normalizes 4 items with decoded entities", async () => {
    const items = await fetchRssFeed("https://feed.example/rss", "yahoo-jp", "JP");
    expect(items).toHaveLength(4);

    const first = items[0];
    expect(first.title).toBe("トヨタ & ホンダ (7203) 上昇");
    expect(first.url).toBe("https://example.com/a");
    expect(first.source).toBe("yahoo-jp");
    expect(first.region).toBe("JP");
    expect(first.symbols).toContain("7203");
    expect(first.language).toBe("ja");
    expect(new Date(first.publishedAt).toISOString()).toBe(first.publishedAt);

    const second = items[1];
    expect(second.title).toBe("AAPL hits new high");
    expect(second.symbols).toContain("AAPL");
    expect(second.summary).toContain('"rally"');

    const invalid = items[2];
    expect(Number.isFinite(Date.parse(invalid.publishedAt))).toBe(true);
    expect(invalid.title).toBe("GDP 'growth' slows");

    const cdata = items[3];
    expect(cdata.title).toBe("ソニー(6758)決算");
    expect(cdata.symbols).toContain("6758");
    expect(cdata.summary).toContain("決算");
  });
});

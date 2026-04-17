import { scoreRelevance } from "./normalize";
import { fetchMarketaux } from "./sources/marketaux";
import { fetchNewsApi } from "./sources/newsApi";
import { fetchRssFeed } from "./sources/rss";
import type { NewsFetchOptions, NewsItem, NewsRegion, NewsSource } from "./types";

interface RssFeedSpec {
  source: NewsSource;
  region: NewsRegion;
  url: string;
}

function envOverride(key: string, fallback: string): string {
  const value = typeof process !== "undefined" ? process.env?.[key] : undefined;
  return value && value.length > 0 ? value : fallback;
}

function getDefaultFeeds(): RssFeedSpec[] {
  return [
    {
      source: "yahoo-jp",
      region: "JP",
      url: envOverride("NEWS_RSS_YAHOO_JP", "https://news.yahoo.co.jp/rss/categories/business.xml"),
    },
    {
      source: "google",
      region: "JP",
      url: envOverride(
        "NEWS_RSS_GOOGLE",
        "https://news.google.com/rss/search?q=%E6%A0%AA%E4%BE%A1&hl=ja&gl=JP&ceid=JP:ja",
      ),
    },
    {
      source: "nikkei",
      region: "JP",
      url: envOverride("NEWS_RSS_NIKKEI", "https://assets.wor.jp/rss/rdf/nikkei/markets.rdf"),
    },
    {
      source: "reuters",
      region: "GLOBAL",
      url: envOverride(
        "NEWS_RSS_REUTERS",
        "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best",
      ),
    },
    {
      source: "yahoo-us",
      region: "US",
      url: envOverride("NEWS_RSS_YAHOO_US", "https://finance.yahoo.com/news/rssindex"),
    },
  ];
}

function matchesRegion(feedRegion: NewsRegion, filter: NewsRegion | undefined): boolean {
  if (!filter) return true;
  if (feedRegion === "GLOBAL") return true;
  return feedRegion === filter;
}

export async function fetchAllNews(options: NewsFetchOptions = {}): Promise<NewsItem[]> {
  const feeds = getDefaultFeeds().filter((f) => matchesRegion(f.region, options.region));
  const limit = options.limit ?? 50;

  const tasks: Array<Promise<NewsItem[]>> = feeds.map((f) =>
    fetchRssFeed(f.url, f.source, f.region, options.signal),
  );

  if (options.newsApiKey) {
    const query = options.symbols && options.symbols.length > 0 ? options.symbols.join(" OR ") : "stock market";
    tasks.push(
      fetchNewsApi(query, options.newsApiKey, {
        region: options.region,
        signal: options.signal,
      }),
    );
  }

  const marketauxKey = options.marketauxKey ?? process.env.MARKETAUX_API_KEY;
  if (marketauxKey) {
    tasks.push(
      fetchMarketaux(marketauxKey, {
        region: options.region,
        symbols: options.symbols,
        limit: Math.min(options.limit ?? 20, 50),
        signal: options.signal,
      }),
    );
  }

  const settled = await Promise.allSettled(tasks);
  const all: NewsItem[] = [];
  settled.forEach((result, idx) => {
    if (result.status === "fulfilled") {
      all.push(...result.value);
    } else {
      const label = feeds[idx]?.source ?? "newsapi";
      console.warn(`[news] fetch failed for ${label}:`, result.reason);
    }
  });

  const byUrl = new Map<string, NewsItem>();
  for (const item of all) {
    if (!byUrl.has(item.url)) byUrl.set(item.url, item);
  }
  let merged = Array.from(byUrl.values());

  if (options.symbols && options.symbols.length > 0) {
    const wanted = new Set(options.symbols);
    merged = merged.filter((item) => item.symbols.some((s) => wanted.has(s)));
  }

  const symbolsForScore = options.symbols ?? [];
  merged.sort((a, b) => scoreRelevance(b, symbolsForScore) - scoreRelevance(a, symbolsForScore));

  return merged.slice(0, limit);
}

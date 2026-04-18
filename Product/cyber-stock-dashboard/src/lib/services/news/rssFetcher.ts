import Parser from "rss-parser";
import { NewsItemSchema, type NewsItem } from "@/lib/providers/types";
import type { RssSource } from "./sources";
import { RSS_SOURCES } from "./sources";

export interface RssFetcherOptions {
  /** テスト用 fetch 差し替え（rss-parser は内部 http モジュールを使うが、本実装では fetch ベースに統一） */
  fetchImpl?: typeof fetch;
  /** タイムアウト ms（デフォルト 8000） */
  timeoutMs?: number;
  parser?: Parser;
}

/** RSS の <item> 最低限フィールド */
interface RawItem {
  guid?: string;
  link?: string;
  title?: string;
  contentSnippet?: string;
  content?: string;
  isoDate?: string;
  pubDate?: string;
}

function toNewsItem(source: RssSource, raw: RawItem): NewsItem | null {
  const title = (raw.title ?? "").trim();
  const url = (raw.link ?? "").trim();
  if (!title || !url) return null;

  const externalId =
    raw.guid?.trim() ||
    url ||
    `${source.id}:${title}`;

  const publishedAt =
    raw.isoDate ||
    (raw.pubDate ? new Date(raw.pubDate).toISOString() : new Date().toISOString());

  const description = (raw.contentSnippet || raw.content || "").trim() || undefined;

  const parsed = NewsItemSchema.safeParse({
    id: `${source.id}:${externalId}`,
    title,
    description,
    url,
    source: source.id,
    publishedAt,
    symbols: [],
    language: source.lang,
  });
  return parsed.success ? parsed.data : null;
}

/**
 * 単一 RSS ソースを取得し NewsItem[] に正規化する。
 * 失敗時は例外を投げる（呼び出し側 Promise.allSettled で吸収する設計）。
 */
export async function fetchRssSource(
  source: RssSource,
  opts: RssFetcherOptions = {},
): Promise<NewsItem[]> {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const fetchImpl = opts.fetchImpl ?? fetch;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  let xml: string;
  try {
    const res = await fetchImpl(source.url, {
      signal: ctrl.signal,
      headers: { "user-agent": "cyber-stock-dashboard/1.0 (+rss)" },
    });
    if (!res.ok) {
      throw new Error(`RSS ${source.id} HTTP ${res.status}`);
    }
    xml = await res.text();
  } finally {
    clearTimeout(t);
  }

  const parser = opts.parser ?? new Parser();
  const feed = await parser.parseString(xml);
  const items = (feed.items ?? []) as RawItem[];
  return items
    .map((raw) => toNewsItem(source, raw))
    .filter((n): n is NewsItem => n !== null);
}

/**
 * 設定済み全 RSS ソースを並列取得する。失敗ソースはスキップする。
 */
export async function fetchAllRss(
  opts: RssFetcherOptions = {},
  sources: RssSource[] = RSS_SOURCES,
): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    sources.map((s) => fetchRssSource(s, opts)),
  );
  const out: NewsItem[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      out.push(...r.value);
    } else {
      console.warn(
        `[rssFetcher] source=${sources[i].id} failed: ${String(r.reason)}`,
      );
    }
  });
  return out;
}

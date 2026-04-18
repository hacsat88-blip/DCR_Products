import type { NewsItem } from "@/lib/providers/types";
import { createMarketauxClient } from "@/lib/providers/marketaux";
import { summarizeNews } from "@/lib/llm/router";
import { getDb, type Database } from "@/lib/db/client";
import {
  getRecentNews,
  upsertManyNews,
} from "@/lib/db/repositories/newsCacheRepo";
import type { NewNewsCache, NewsCache } from "@/lib/db/schema";
import { fetchAllRss } from "./rssFetcher";
import { RSS_SOURCES, type RssSource } from "./sources";

/** キャッシュ TTL: 30 分 */
export const CACHE_TTL_MS = 30 * 60 * 1000;
/** LLM 要約に渡す最大件数（NewsSummarySchema は最大 5 件） */
const SUMMARIZE_BATCH_SIZE = 5;

const FORBIDDEN_TERMS = ["必ず", "絶対", "保証", "確実", "買え", "売れ"];

export interface AggregatedNewsItem extends NewsItem {
  summary?: string;
  sentimentLabel?: "positive" | "neutral" | "negative";
  sectors?: string[];
}

export interface FetchAllNewsParams {
  symbols?: string[];
  sectors?: string[];
  limit?: number;
  useCache?: boolean;
}

export interface AggregatorDeps {
  db?: Database;
  marketauxClient?: { getNews: (p?: { symbols?: string[]; sectors?: string[]; limit?: number }) => Promise<NewsItem[]> };
  fetchRss?: () => Promise<NewsItem[]>;
  summarize?: typeof summarizeNews;
  now?: () => number;
  /** RSS ソースのオーバーライド（テスト用） */
  rssSources?: RssSource[];
}

/** 簡易禁止語チェック。検出されたら警告ログのみ。 */
function checkForbidden(text: string, ctx: string): void {
  const hits = FORBIDDEN_TERMS.filter((w) => text.includes(w));
  if (hits.length > 0) {
    console.warn(
      `[news.aggregator] forbidden terms ${JSON.stringify(hits)} detected in ${ctx}`,
    );
  }
}

/** タイトル正規化（重複排除のキー） */
function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[【】「」『』\[\](){}<>"'’“”]/g, "")
    .trim();
}

/** URL or 正規化タイトルで重複排除 */
export function dedupeNews(items: NewsItem[]): NewsItem[] {
  const seenUrl = new Set<string>();
  const seenTitle = new Set<string>();
  const out: NewsItem[] = [];
  for (const it of items) {
    const u = it.url.split("?")[0];
    const k = normalizeTitle(it.title);
    if (seenUrl.has(u) || seenTitle.has(k)) continue;
    seenUrl.add(u);
    seenTitle.add(k);
    out.push(it);
  }
  return out;
}

function rowToNewsItem(row: NewsCache): AggregatedNewsItem {
  return {
    id: `${row.source}:${row.externalId}`,
    title: row.title,
    description: row.summary ?? undefined,
    url: row.url,
    source: row.source,
    publishedAt: new Date(row.publishedAt).toISOString(),
    symbols: [],
    language: row.lang ?? undefined,
    summary: row.summary ?? undefined,
  };
}

/** cache hit 判定: 最新 fetchedAt が TTL 以内なら有効 */
function isCacheFresh(rows: NewsCache[], nowMs: number): boolean {
  if (rows.length === 0) return false;
  const latest = rows.reduce(
    (acc, r) => Math.max(acc, new Date(r.fetchedAt).getTime()),
    0,
  );
  return nowMs - latest < CACHE_TTL_MS;
}

function tryMarketaux(
  client: AggregatorDeps["marketauxClient"],
  params: FetchAllNewsParams,
): Promise<NewsItem[]> {
  if (!client) return Promise.resolve([]);
  return client
    .getNews({
      symbols: params.symbols,
      sectors: params.sectors,
      limit: params.limit,
    })
    .catch((e: unknown) => {
      console.warn(`[news.aggregator] marketaux failed: ${String(e)}`);
      return [];
    });
}

function resolveMarketauxClient(
  deps: AggregatorDeps,
): AggregatorDeps["marketauxClient"] {
  if (deps.marketauxClient !== undefined) return deps.marketauxClient;
  if (!process.env.MARKETAUX_API_KEY) {
    console.info(
      "[news.aggregator] MARKETAUX_API_KEY 未設定のため Marketaux をスキップ",
    );
    return undefined;
  }
  return createMarketauxClient();
}

/**
 * Marketaux + RSS を統合し、LLM 要約とキャッシュ永続化を行う。
 */
export async function fetchAllNews(
  params: FetchAllNewsParams = {},
  deps: AggregatorDeps = {},
): Promise<AggregatedNewsItem[]> {
  const limit = params.limit ?? 30;
  const useCache = params.useCache ?? true;
  const now = deps.now ?? (() => Date.now());
  const db = deps.db ?? getDb();

  // 1) cache check
  if (useCache) {
    const rows = getRecentNews(db, limit);
    if (isCacheFresh(rows, now())) {
      return rows.map(rowToNewsItem).slice(0, limit);
    }
  }

  // 2) cache miss: marketaux + RSS 並列取得
  const marketauxClient = resolveMarketauxClient(deps);
  const fetchRss = deps.fetchRss ?? (() => fetchAllRss({}, deps.rssSources ?? RSS_SOURCES));

  const [mxResult, rssResult] = await Promise.allSettled([
    tryMarketaux(marketauxClient, params),
    fetchRss(),
  ]);

  const collected: NewsItem[] = [];
  if (mxResult.status === "fulfilled") collected.push(...mxResult.value);
  else console.warn(`[news.aggregator] marketaux rejected: ${String(mxResult.reason)}`);
  if (rssResult.status === "fulfilled") collected.push(...rssResult.value);
  else console.warn(`[news.aggregator] rss rejected: ${String(rssResult.reason)}`);

  // 3) 重複排除 + publishedAt desc
  const deduped = dedupeNews(collected).sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  const trimmed = deduped.slice(0, limit);

  // 4) LLM 要約（先頭 N 件）。失敗時は原文 title を summary にフォールバック。
  const summarizer = deps.summarize ?? summarizeNews;
  const head = trimmed.slice(0, SUMMARIZE_BATCH_SIZE);
  let summarized: AggregatedNewsItem[];
  try {
    if (head.length > 0 && process.env.OPENROUTER_API_KEY) {
      const resp = await summarizer(
        head.map((n) => ({
          title: n.title,
          body: n.description,
          url: n.url,
          publishedAt: n.publishedAt,
          source: n.source,
        })),
      );
      const byTitle = new Map(
        resp.items.map((s) => [normalizeTitle(s.title), s]),
      );
      summarized = trimmed.map((n, i) => {
        const s =
          byTitle.get(normalizeTitle(n.title)) ??
          (i < resp.items.length ? resp.items[i] : undefined);
        if (!s) return { ...n, summary: n.description ?? n.title };
        checkForbidden(s.summary, `news[${i}].summary`);
        return {
          ...n,
          summary: s.summary,
          sentimentLabel: s.sentiment,
          sectors: s.sectors,
        };
      });
    } else {
      summarized = trimmed.map((n) => ({
        ...n,
        summary: n.description ?? n.title,
      }));
    }
  } catch (e) {
    console.warn(`[news.aggregator] LLM summarize failed: ${String(e)}`);
    summarized = trimmed.map((n) => ({
      ...n,
      summary: n.description ?? n.title,
    }));
  }

  // 5) 永続化
  if (summarized.length > 0) {
    const rows: NewNewsCache[] = summarized.map((n) => ({
      source: n.source ?? "unknown",
      externalId: n.id,
      url: n.url,
      title: n.title,
      summary: n.summary ?? null,
      lang: n.language ?? null,
      publishedAt: new Date(n.publishedAt),
      fetchedAt: new Date(now()),
    }));
    try {
      upsertManyNews(db, rows);
    } catch (e) {
      console.warn(`[news.aggregator] upsert failed: ${String(e)}`);
    }
  }

  return summarized;
}

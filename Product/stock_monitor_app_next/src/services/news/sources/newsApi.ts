import { consume, RateLimitExceededError, reportBackoff } from "@/lib/rateLimiter";
import { detectSymbols, stableId } from "../normalize";
import type { NewsItem, NewsRegion } from "../types";

const ENDPOINT = "https://newsapi.org/v2/everything";
const FETCH_TIMEOUT_MS = 10_000;

interface NewsApiArticle {
  title: string | null;
  description: string | null;
  url: string | null;
  publishedAt: string | null;
  source?: { name?: string | null } | null;
}

interface NewsApiResponse {
  status: string;
  articles?: NewsApiArticle[];
  message?: string;
}

export interface FetchNewsApiOptions {
  region?: NewsRegion;
  signal?: AbortSignal;
}

export async function fetchNewsApi(
  query: string,
  apiKey: string | undefined,
  options: FetchNewsApiOptions = {},
): Promise<NewsItem[]> {
  if (!apiKey) return [];
  if (!query.trim()) return [];

  try {
    consume({ key: "newsapi", perDay: 100 });
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      reportBackoff("newsapi", err.retryAfterMs, err.message);
    }
    throw err;
  }

  const params = new URLSearchParams({
    q: query,
    sortBy: "publishedAt",
    pageSize: "50",
  });
  if (options.region === "US") params.set("language", "en");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener("abort", onExternalAbort, { once: true });
  }

  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
      headers: { "X-Api-Key": apiKey, accept: "application/json" },
    });
    if (!res.ok) {
      if (res.status === 429) {
        reportBackoff("newsapi", 24 * 3_600_000, "NewsAPI HTTP 429");
      }
      throw new Error(`NewsAPI fetch failed: HTTP ${res.status}`);
    }
    const data = (await res.json()) as NewsApiResponse;
    if (data.status !== "ok" || !Array.isArray(data.articles)) {
      throw new Error(`NewsAPI returned non-ok status: ${data.message ?? data.status}`);
    }

    const region: NewsRegion = options.region ?? "GLOBAL";
    const items: NewsItem[] = [];
    for (const article of data.articles) {
      if (!article.url || !article.title) continue;
      const text = `${article.title} ${article.description ?? ""}`;
      const publishedMs = article.publishedAt ? Date.parse(article.publishedAt) : NaN;
      items.push({
        id: stableId(article.url),
        source: "newsapi",
        region,
        title: article.title,
        url: article.url,
        summary: article.description ?? null,
        publishedAt: Number.isFinite(publishedMs)
          ? new Date(publishedMs).toISOString()
          : new Date().toISOString(),
        symbols: detectSymbols(text),
        language: region === "JP" ? "ja" : "en",
      });
    }
    return items;
  } catch (err) {
    if (err instanceof RateLimitExceededError) throw err;
    reportBackoff("newsapi", 60_000, err instanceof Error ? err.message : String(err));
    throw err;
  } finally {
    clearTimeout(timer);
    if (options.signal) options.signal.removeEventListener("abort", onExternalAbort);
  }
}

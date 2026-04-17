// ────────────────────────────────────────────────
// Marketaux news source
// ────────────────────────────────────────────────
//
// Free tier: 100 requests/day, up to 3 articles per request.
// Docs: https://www.marketaux.com/documentation
//
// We use it mainly for ticker-tagged news with entity sentiment —
// the free-tier volume is small enough that we treat it as a
// complementary stream on top of the always-on RSS aggregator.

import { consume, RateLimitExceededError, reportBackoff } from "@/lib/rateLimiter";

import { stableId } from "../normalize";
import type { NewsItem, NewsRegion } from "../types";

const ENDPOINT = "https://api.marketaux.com/v1/news/all";
const TIMEOUT_MS = 10_000;
const RATE_LIMIT_KEY = "marketaux";

interface MarketauxEntity {
  symbol?: string;
  sentiment_score?: number;
}

interface MarketauxArticle {
  uuid?: string;
  title?: string;
  description?: string;
  snippet?: string;
  url?: string;
  published_at?: string;
  language?: string;
  entities?: MarketauxEntity[];
}

interface MarketauxResponse {
  data?: MarketauxArticle[];
  meta?: { returned?: number };
}

export interface MarketauxFetchOptions {
  symbols?: string[];
  region?: NewsRegion;
  limit?: number;
  signal?: AbortSignal;
}

function regionToCountries(region: NewsRegion | undefined): string | undefined {
  if (!region || region === "GLOBAL") return undefined;
  if (region === "JP") return "jp";
  if (region === "US") return "us";
  return undefined;
}

function detectLanguage(language: string | undefined, title: string): "ja" | "en" {
  if (language === "ja") return "ja";
  if (language === "en") return "en";
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(title) ? "ja" : "en";
}

function pickPrimarySentiment(entities: MarketauxEntity[] | undefined): number | undefined {
  if (!entities || entities.length === 0) return undefined;
  const scores = entities
    .map((e) => e.sentiment_score)
    .filter((s): s is number => typeof s === "number" && Number.isFinite(s));
  if (scores.length === 0) return undefined;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.max(-1, Math.min(1, avg));
}

export async function fetchMarketaux(
  apiKey: string,
  options: MarketauxFetchOptions = {},
): Promise<NewsItem[]> {
  if (!apiKey) return [];

  try {
    consume({ key: RATE_LIMIT_KEY, perMinute: 10, perDay: 100 });
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      console.warn(`[marketaux] rate limited locally: ${err.message}`);
      return [];
    }
    throw err;
  }

  const params = new URLSearchParams();
  params.set("api_token", apiKey);
  params.set("filter_entities", "true");
  params.set("limit", String(Math.min(options.limit ?? 3, 50)));
  if (options.symbols && options.symbols.length > 0) {
    params.set("symbols", options.symbols.join(","));
  }
  const country = regionToCountries(options.region);
  if (country) params.set("countries", country);

  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort);
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (res.status === 429) {
      reportBackoff(RATE_LIMIT_KEY, 60_000, "Marketaux 429");
      return [];
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[marketaux] HTTP ${res.status}: ${text.slice(0, 160)}`);
      return [];
    }

    const json = (await res.json()) as MarketauxResponse;
    const articles = json.data ?? [];

    const items: NewsItem[] = [];
    for (const a of articles) {
      if (!a.title || !a.url) continue;
      const publishedAt = a.published_at
        ? new Date(a.published_at).toISOString()
        : new Date().toISOString();
      const symbols = (a.entities ?? [])
        .map((e) => e.symbol)
        .filter((s): s is string => typeof s === "string" && s.length > 0);
      const language = detectLanguage(a.language, a.title);
      const region: NewsRegion =
        options.region ?? (language === "ja" ? "JP" : country === "jp" ? "JP" : "US");
      items.push({
        id: a.uuid ?? stableId(a.url),
        source: "marketaux",
        region,
        title: a.title,
        url: a.url,
        summary: a.description ?? a.snippet ?? null,
        publishedAt,
        symbols,
        language,
        sentiment: pickPrimarySentiment(a.entities),
      });
    }
    return items;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      console.warn("[marketaux] request timed out");
      return [];
    }
    console.warn("[marketaux] unexpected error:", err);
    return [];
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}

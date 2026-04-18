import { z } from "zod";
import { requireEnv } from "@/lib/env";
import { NewsItemSchema, type FetchDeps, type NewsItem } from "./types";
import { createRateLimiter } from "./rateLimit";

const BASE_URL = "https://api.marketaux.com/v1";

const EntitySchema = z.object({
  symbol: z.string().optional(),
  sentiment_score: z.number().optional(),
});

const ArticleSchema = z.object({
  uuid: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  snippet: z.string().nullable().optional(),
  url: z.string(),
  source: z.string().nullable().optional(),
  published_at: z.string(),
  language: z.string().nullable().optional(),
  entities: z.array(EntitySchema).default([]),
});

const NewsResponseSchema = z.object({
  data: z.array(ArticleSchema),
});

export interface GetNewsParams {
  symbols?: string[];
  sectors?: string[];
  language?: string;
  limit?: number;
}

export interface MarketauxClient {
  getNews(params?: GetNewsParams): Promise<NewsItem[]>;
}

export interface CreateMarketauxClientOptions extends FetchDeps {
  apiKey?: string;
  baseUrl?: string;
}

export function createMarketauxClient(
  opts: CreateMarketauxClientOptions = {},
): MarketauxClient {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const baseUrl = opts.baseUrl ?? BASE_URL;
  const limiter = createRateLimiter({ minIntervalMs: 250 });
  const apiKey = (): string => opts.apiKey ?? requireEnv("MARKETAUX_API_KEY");

  async function getNews(params: GetNewsParams = {}): Promise<NewsItem[]> {
    const search = new URLSearchParams({ api_token: apiKey() });
    if (params.symbols?.length) search.set("symbols", params.symbols.join(","));
    if (params.sectors?.length)
      search.set("industries", params.sectors.join(","));
    if (params.language) search.set("language", params.language);
    if (params.limit) search.set("limit", String(params.limit));

    const url = `${baseUrl}/news/all?${search.toString()}`;
    const res = await limiter.schedule(() => fetchImpl(url));
    if (!res.ok) {
      throw new Error(`Marketaux failed: ${res.status}`);
    }
    const json = await res.json();
    const parsed = NewsResponseSchema.parse(json);

    return parsed.data.map((a) => {
      const symbols = a.entities
        .map((e) => e.symbol)
        .filter((s): s is string => Boolean(s));
      const sentiments = a.entities
        .map((e) => e.sentiment_score)
        .filter((s): s is number => typeof s === "number");
      const sentiment =
        sentiments.length > 0
          ? sentiments.reduce((acc, n) => acc + n, 0) / sentiments.length
          : undefined;
      return NewsItemSchema.parse({
        id: a.uuid,
        title: a.title,
        description: a.description ?? a.snippet ?? undefined,
        url: a.url,
        source: a.source ?? undefined,
        publishedAt: a.published_at,
        symbols,
        sentiment,
        language: a.language ?? undefined,
      });
    });
  }

  return { getNews };
}

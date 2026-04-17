export type NewsSource =
  | "yahoo-jp"
  | "yahoo-us"
  | "google"
  | "nikkei"
  | "reuters"
  | "newsapi"
  | "marketaux"
  | "tdnet"
  | "edinet";

export type NewsRegion = "JP" | "US" | "GLOBAL";

export interface NewsItem {
  id: string;
  source: NewsSource;
  region: NewsRegion;
  title: string;
  url: string;
  summary: string | null;
  publishedAt: string;
  symbols: string[];
  language: "ja" | "en";
  /** -1..1, optional; some providers supply entity sentiment (e.g. Marketaux). */
  sentiment?: number;
}

export interface NewsFetchOptions {
  region?: NewsRegion;
  symbols?: string[];
  limit?: number;
  newsApiKey?: string;
  marketauxKey?: string;
  signal?: AbortSignal;
}

export type StockSearchSource = "registered" | "catalog" | "claude" | "web";

export interface StockSearchResult {
  code: string;
  name: string;
  source: StockSearchSource;
  isRegistered: boolean;
  sector: string | null;
  oneLiner: string;
  summary: string;
}

export interface StockSearchResponse {
  results: StockSearchResult[];
  error: string | null;
}

export interface StockSearchOptions {
  registeredCodes?: Iterable<string>;
  limit?: number;
}

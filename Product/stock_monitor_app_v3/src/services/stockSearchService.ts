export interface StockSearchResult {
  code: string;
  name: string;
  source: "registered" | "edinet";
  isRegistered: boolean;
}

interface StockSearchResponse {
  results: StockSearchResult[];
  error: string | null;
}

export const stockSearchService = {
  async search(query: string): Promise<StockSearchResponse> {
    const url = `/api/stock-search?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Stock search API failed: HTTP ${response.status}`);
    }
    const payload = (await response.json()) as StockSearchResponse;
    return {
      results: Array.isArray(payload.results) ? payload.results : [],
      error: typeof payload.error === "string" ? payload.error : null
    };
  }
};


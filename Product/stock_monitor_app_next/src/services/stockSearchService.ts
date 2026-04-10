import { searchStocksWithClaudeFallback } from "@/services/claudeSearchProvider";
import type { StockSearchOptions, StockSearchResponse, StockSearchResult } from "@/types/search";

export type { StockSearchResult } from "@/types/search";

/**
 * Hybrid search: server-side Yahoo Finance → local catalog fallback.
 * Yahoo search runs via /api/stock-search to avoid browser CORS restrictions.
 * Local catalog provides instant fallback when the API route is unreachable.
 */
export const stockSearchService = {
  async search(query: string, options: StockSearchOptions = {}): Promise<StockSearchResponse> {
    const registeredCodes = new Set(Array.from(options.registeredCodes ?? []));

    try {
      // Route through server-side API to avoid CORS (Yahoo Finance blocks browser requests)
      const params = new URLSearchParams({ q: query });
      const response = await fetch(`/api/stock-search?${params}`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: null }));
        if (body?.error) {
          return { results: [], error: body.error };
        }
        throw new Error(`API ${response.status}`);
      }
      const data: StockSearchResponse = await response.json();

      // Re-mark registered status using client-side knowledge
      const results: StockSearchResult[] = data.results.map((r) => ({
        ...r,
        isRegistered: registeredCodes.has(r.code),
        source: registeredCodes.has(r.code) ? "registered" : r.source,
      }));

      return { results, error: data.error };
    } catch {
      // API unreachable — fall back to local catalog search
      return searchStocksWithClaudeFallback(query, options);
    }
  }
};

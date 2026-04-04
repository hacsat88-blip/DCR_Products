import { MockProvider } from "@/services/providers/mockProvider";
import { DEFAULT_STOCK_CODES, StockFetchResult } from "@/services/providers/types";

function buildMockResult(error: string | null): StockFetchResult {
  const fetchedAt = new Date().toISOString();
  return {
    stocks: [],
    dataMode: "mock",
    lastUpdatedAt: fetchedAt,
    error,
    fallbackReason: "フロントエンド取得に失敗したため mock データを表示しています。",
    health: [
      {
        provider: "jquants",
        ok: false,
        message: "client fallback",
        errorCode: "network",
        latencyMs: null,
        fetchedAt,
        sourceTimestamp: null,
        sourceLabel: null
      },
      {
        provider: "edinetDb",
        ok: false,
        message: "client fallback",
        errorCode: "network",
        latencyMs: null,
        fetchedAt,
        sourceTimestamp: null,
        sourceLabel: null
      }
    ]
  };
}

export const stockService = {
  async fetchStocks(codes: string[] = [...DEFAULT_STOCK_CODES]): Promise<StockFetchResult> {
    try {
      const url = `/api/stocks?codes=${encodeURIComponent(codes.join(","))}`;
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Stock API failed: HTTP ${response.status}`);
      }

      const payload = (await response.json()) as StockFetchResult;
      if (!Array.isArray(payload.stocks) || !payload.dataMode) {
        throw new Error("Stock API response is malformed.");
      }
      return payload;
    } catch (error) {
      const mockProvider = new MockProvider();
      const fallbackStocks = await mockProvider.getStocks(codes);
      const failed = buildMockResult(
        error instanceof Error
          ? `実データ取得に失敗しました: ${error.message}`
          : "実データ取得に失敗しました。"
      );
      return { ...failed, stocks: fallbackStocks };
    }
  }
};

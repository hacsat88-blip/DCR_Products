import { MockProvider } from "@/services/providers/mockProvider";
import { DEFAULT_STOCK_CODES, StockFetchResult } from "@/services/providers/types";
import { DEFAULT_SOURCE_META, resolveSourceLabel } from "@/types/source";

export type StockFetchPhase = "price" | "full";

interface FetchStocksOptions {
  phase?: StockFetchPhase;
  signal?: AbortSignal;
}

function buildMockResult(error: string | null): StockFetchResult {
  const fetchedAt = new Date().toISOString();
  return {
    stocks: [],
    dataMode: "mock",
    sourceLabel: "M",
    sourceMeta: { ...DEFAULT_SOURCE_META },
    lastUpdatedAt: fetchedAt,
    error,
    fallbackReason: "フロントエンド取得に失敗したため mock データを表示しています。",
    health: [
      {
        provider: "yahoo",
        ok: false,
        message: "client fallback",
        errorCode: "network",
        latencyMs: null,
        fetchedAt,
        sourceTimestamp: null,
        sourceLabel: "M"
      },
      {
        provider: "alphaVantage",
        ok: false,
        message: "client fallback",
        errorCode: "network",
        latencyMs: null,
        fetchedAt,
        sourceTimestamp: null,
        sourceLabel: "M"
      },
      {
        provider: "edinetDb",
        ok: false,
        message: "client fallback",
        errorCode: "network",
        latencyMs: null,
        fetchedAt,
        sourceTimestamp: null,
        sourceLabel: "M"
      }
    ]
  };
}

export const stockService = {
  async fetchStocks(
    codes: string[] = [...DEFAULT_STOCK_CODES],
    options: FetchStocksOptions = {}
  ): Promise<StockFetchResult> {
    try {
      const params = new URLSearchParams();
      params.set("codes", codes.join(","));
      if (options.phase && options.phase !== "full") {
        params.set("phase", options.phase);
      }
      const response = await fetch(`/api/stocks?${params.toString()}`, {
        cache: "no-store",
        signal: options.signal
      });
      if (!response.ok) {
        throw new Error(`Stock API failed: HTTP ${response.status}`);
      }

      const payload = (await response.json()) as StockFetchResult;
      if (!Array.isArray(payload.stocks) || !payload.dataMode) {
        throw new Error("Stock API response is malformed.");
      }
      const derivedPriceSource = resolveSourceLabel(
        payload.stocks.map((stock) => stock.priceSourceLabel ?? null)
      );
      const derivedFundamentalsSource = resolveSourceLabel(
        payload.stocks.map((stock) => stock.fundamentalsSourceLabel ?? null)
      );
      return {
        ...payload,
        sourceMeta:
          payload.sourceMeta ??
          {
            overall: payload.sourceLabel ?? resolveSourceLabel([derivedPriceSource, derivedFundamentalsSource]),
            price: derivedPriceSource,
            fundamentals: derivedFundamentalsSource
          }
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }
      const mockProvider = new MockProvider();
      const fallbackStocks = (await mockProvider.getStocks(codes)).map((stock) => ({
        ...stock,
        priceSourceLabel: stock.priceSourceLabel ?? "M",
        fundamentalsSourceLabel: stock.fundamentalsSourceLabel ?? "M"
      }));
      const failed = buildMockResult(
        error instanceof Error
          ? `実データ取得に失敗しました: ${error.message}`
          : "実データ取得に失敗しました。"
      );
      return { ...failed, stocks: fallbackStocks };
    }
  }
};

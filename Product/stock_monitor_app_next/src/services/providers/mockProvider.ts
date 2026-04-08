import { mockStocks } from "@/data/mockStocks";
import { Stock } from "@/types/stock";

import { StockDataProvider } from "./types";

export class MockProvider implements StockDataProvider {
  async getStocks(codes: string[]): Promise<Stock[]> {
    const codeSet = new Set(codes);
    return mockStocks
      .filter((stock) => codeSet.has(stock.code))
      .map((stock) => ({
        ...stock,
        // TODO(Phase 3): replace with live time-series endpoint when historical API is connected.
        chartData: stock.chartData.map((point) => ({ ...point }))
      }));
  }
}

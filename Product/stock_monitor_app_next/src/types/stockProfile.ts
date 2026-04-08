export type StockProfileBackfillState = "resolved" | "unavailable";

export interface RegisteredStockProfile {
  sector: string | null;
  oneLiner: string;
  summary: string;
  backfillState: StockProfileBackfillState;
  updatedAt: string;
}

export type RegisteredStockProfileMap = Record<string, RegisteredStockProfile>;

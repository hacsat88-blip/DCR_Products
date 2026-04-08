import { StockAction } from "@/types/stock";

export interface BacktestPoint {
  date: string;
  stockCode: string;
  price: number | null;
  benchmark: number | null;
  score: number | null;
  action: StockAction | null;
  strategyIndex?: number | null;
  benchmarkIndex?: number | null;
}

export interface BacktestResult {
  id: string;
  stockCode?: string;
  mode: "single_stock" | "watchlist";
  startedAt: string;
  endedAt: string;
  totalReturnPct: number | null;
  benchmarkReturnPct: number | null;
  excessReturnPct: number | null;
  maxDrawdownPct: number | null;
  actionChanges: number;
  notes?: string;
  points: BacktestPoint[];
}

export interface HistoryDataPoint {
  date: string;
  price: number | null;
  benchmark: number | null;
  revenueGrowth: number | null;
  opGrowth: number | null;
  operatingCF: number | null;
  per: number | null;
  pbr: number | null;
  dividendYield: number | null;
  hasDilutionRisk?: boolean;
  hasOneOffProfitRisk?: boolean;
}

export interface BacktestRunParams {
  mode?: "single_stock" | "watchlist";
  stockCode?: string;
  startDate?: string;
  endDate?: string;
}


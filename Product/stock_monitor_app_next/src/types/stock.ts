import type { ScoreBreakdownItem } from "@/types/scoring";
import type { SourceLabel } from "@/types/source";

export type StockAction = "buy_now" | "wait_earnings" | "wait_pullback" | "exclude";

export interface StockChartPoint {
  date: string;
  price: number;
  benchmark: number;
}

export interface Stock {
  id: string;
  code: string;
  name: string;
  sector: string;
  themeTags: string[];
  price: number;
  changePercent: number;
  marketCap: number;
  per: number | null;
  pbr: number | null;
  dividendYield: number | null;
  revenueGrowth: number | null;
  opGrowth: number | null;
  operatingCF: number | null;
  manualAction?: StockAction | null;
  hasDilutionRisk?: boolean;
  hasOneOffProfitRisk?: boolean;
  oneLiner: string;
  summary: string;
  coreKpiLabel: string;
  coreKpiValue: string;
  riskSignal: string;
  collapseCondition: string;
  priceUpdatedAt?: string | null;
  priceSourceLabel?: SourceLabel | null;
  fundamentalsUpdatedAt?: string | null;
  fundamentalsSubmitDate?: string | null;
  fundamentalsSourceLabel?: SourceLabel | null;
  memo?: string;
  watched?: boolean;
  chartData: StockChartPoint[];
}

export interface StockEvaluation {
  score: number;
  evaluatedAction: StockAction;
  breakdown: ScoreBreakdownItem[];
  scoreSummary: string;
  actionReason: string;
  riskFlags: string[];
}

export interface EvaluatedStock extends Stock, StockEvaluation {}

export interface HypothesisLog {
  hypothesis: string;
  rationale: string;
  reviewDate: string;
  outcome: string;
  updatedAt: string;
}

export type MarketCapBand = "all" | "small" | "mid" | "large";
export type DividendFilter = "all" | "with" | "without";
export type WatchFilter = "all" | "watching" | "not_watching";

export interface StockFilters {
  query: string;
  priceMin: number | null;
  priceMax: number | null;
  sector: string;
  action: "all" | StockAction;
  marketCapBand: MarketCapBand;
  revenueGrowthMin: number | null;
  opGrowthMin: number | null;
  operatingCFMin: number | null;
  dividend: DividendFilter;
  perMax: number | null;
  pbrMax: number | null;
  watch: WatchFilter;
}

export type HoldingsMap = Record<string, number>;

export type SortKey =
  | "score_desc"
  | "price_asc"
  | "price_desc"
  | "revenue_growth_desc"
  | "op_growth_desc";

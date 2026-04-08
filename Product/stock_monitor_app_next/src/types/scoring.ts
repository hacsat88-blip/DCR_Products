import { StockAction } from "@/types/stock";

export interface ScoreBreakdownItem {
  id: string;
  label: string;
  type: "bonus" | "penalty";
  value: number;
  reason: string;
}

export interface ScoreEvaluation {
  score: number;
  evaluatedAction: StockAction;
  breakdown: ScoreBreakdownItem[];
  scoreSummary: string;
}

export interface ScoringConfig {
  revenueGrowthThreshold: number;
  revenueGrowthWeight: number;
  opGrowthThreshold: number;
  opGrowthWeight: number;
  operatingCFBonus: number;
  perPenaltyThreshold: number;
  perPenaltyWeight: number;
  dilutionPenalty: number;
  oneOffProfitPenalty: number;
}

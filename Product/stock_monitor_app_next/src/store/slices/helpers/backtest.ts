import { DEFAULT_SCORING_CONFIG } from "@/lib/scoring";
import { BacktestResult, HistoryDataPoint } from "@/types/backtest";
import { ScoringConfig } from "@/types/scoring";
import { EvaluatedStock } from "@/types/stock";

import { readJSON, readString, writeJSON, writeString } from "./persistence";

export const SCORING_CONFIG_KEY = "stock-monitor-scoring-config-v1";
export const BACKTEST_RESULTS_KEY = "stock-monitor-backtest-results-v1";
export const BACKTEST_SCHEMA_VERSION_KEY = "stock-monitor-backtest-schema-version";
export const BACKTEST_SCHEMA_VERSION = "phase4-v1";
export const BACKTEST_RESULTS_MAX = 20;

export function normalizeBacktestResults(results: BacktestResult[]): BacktestResult[] {
  return [...results]
    .sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt))
    .slice(0, BACKTEST_RESULTS_MAX);
}

export function sanitizeScoringConfig(input: Partial<ScoringConfig> | undefined): ScoringConfig {
  return {
    revenueGrowthThreshold: Number.isFinite(input?.revenueGrowthThreshold)
      ? Number(input!.revenueGrowthThreshold)
      : DEFAULT_SCORING_CONFIG.revenueGrowthThreshold,
    revenueGrowthWeight: Number.isFinite(input?.revenueGrowthWeight)
      ? Number(input!.revenueGrowthWeight)
      : DEFAULT_SCORING_CONFIG.revenueGrowthWeight,
    opGrowthThreshold: Number.isFinite(input?.opGrowthThreshold)
      ? Number(input!.opGrowthThreshold)
      : DEFAULT_SCORING_CONFIG.opGrowthThreshold,
    opGrowthWeight: Number.isFinite(input?.opGrowthWeight)
      ? Number(input!.opGrowthWeight)
      : DEFAULT_SCORING_CONFIG.opGrowthWeight,
    operatingCFBonus: Number.isFinite(input?.operatingCFBonus)
      ? Number(input!.operatingCFBonus)
      : DEFAULT_SCORING_CONFIG.operatingCFBonus,
    perPenaltyThreshold: Number.isFinite(input?.perPenaltyThreshold)
      ? Number(input!.perPenaltyThreshold)
      : DEFAULT_SCORING_CONFIG.perPenaltyThreshold,
    perPenaltyWeight: Number.isFinite(input?.perPenaltyWeight)
      ? Number(input!.perPenaltyWeight)
      : DEFAULT_SCORING_CONFIG.perPenaltyWeight,
    dilutionPenalty: Number.isFinite(input?.dilutionPenalty)
      ? Number(input!.dilutionPenalty)
      : DEFAULT_SCORING_CONFIG.dilutionPenalty,
    oneOffProfitPenalty: Number.isFinite(input?.oneOffProfitPenalty)
      ? Number(input!.oneOffProfitPenalty)
      : DEFAULT_SCORING_CONFIG.oneOffProfitPenalty
  };
}

export function fallbackHistoryFromStock(stock: EvaluatedStock): HistoryDataPoint[] {
  return stock.chartData.map((point) => ({
    date: point.date,
    price: point.price,
    benchmark: point.benchmark,
    revenueGrowth: stock.revenueGrowth,
    opGrowth: stock.opGrowth,
    operatingCF: stock.operatingCF,
    per: stock.per,
    pbr: stock.pbr,
    dividendYield: stock.dividendYield,
    hasDilutionRisk: stock.hasDilutionRisk,
    hasOneOffProfitRisk: stock.hasOneOffProfitRisk
  }));
}

export function initializeBacktestStorage(): {
  scoringConfig: ScoringConfig;
  backtestResults: BacktestResult[];
} {
  const version = readString(BACKTEST_SCHEMA_VERSION_KEY, "");
  if (version !== BACKTEST_SCHEMA_VERSION) {
    writeJSON(SCORING_CONFIG_KEY, DEFAULT_SCORING_CONFIG);
    writeJSON(BACKTEST_RESULTS_KEY, []);
    writeString(BACKTEST_SCHEMA_VERSION_KEY, BACKTEST_SCHEMA_VERSION);
    return {
      scoringConfig: DEFAULT_SCORING_CONFIG,
      backtestResults: []
    };
  }

  const scoringConfig = sanitizeScoringConfig(readJSON<Partial<ScoringConfig>>(SCORING_CONFIG_KEY, {}));
  const backtestResults = normalizeBacktestResults(readJSON<BacktestResult[]>(BACKTEST_RESULTS_KEY, []));

  return {
    scoringConfig,
    backtestResults
  };
}

export { DEFAULT_SCORING_CONFIG };

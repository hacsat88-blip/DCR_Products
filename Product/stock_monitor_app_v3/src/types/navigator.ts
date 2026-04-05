// ────────────────────────────────────────────────
// Navigator Settings
// ────────────────────────────────────────────────

export type MarketScope = "US" | "JP" | "BOTH";
export type RiskTolerance = "low" | "mid" | "high";
export type InvestmentHorizon = "short" | "mid" | "long";

export interface NavigatorSettings {
  market: MarketScope;
  risk: RiskTolerance;
  horizon: InvestmentHorizon;
}

// ────────────────────────────────────────────────
// STATE 1: Macro Research
// ────────────────────────────────────────────────

export type MarketEnvironment = "bullish" | "neutral" | "bearish";
export type EnvironmentLabel = "🟢強気" | "🟡中立" | "🔴弱気";

export interface MacroSector {
  name: string;
  reason: string;
}

export interface MacroRisk {
  name: string;
  /** 1-5 severity rating */
  stars: number;
  trend: "↑" | "→" | "↓";
}

/** Result of the macro-environment analysis stage. */
export interface MacroResult {
  environment: MarketEnvironment;
  label: EnvironmentLabel;
  sectors: MacroSector[];
  risks: MacroRisk[];
  /** Cross-market chain insight. Non-null only when market === "BOTH". */
  chain: string | null;
}

// ────────────────────────────────────────────────
// STATE 2: Stock Selection
// ────────────────────────────────────────────────

export type StockType = "stock" | "etf" | "fund";
export type CfTrend = "↑" | "↗" | "→" | "↘" | "↓";

export interface SelectedStock {
  code: string;
  name: string;
  /** Formatted price string — "¥xxx" or "$xx.xx" */
  price: string;
  /** Free-cash-flow yield — "x%" or "N/A" */
  fcfYield: string;
  /** Cash-flow margin — "x%" or "N/A" */
  cfMargin: string;
  cfTrend: CfTrend;
  sector: string;
  type: StockType;
  /** Two-sentence selection reason */
  reason: string;
}

export interface StockSelectionResult {
  stocks: SelectedStock[];
}

// ────────────────────────────────────────────────
// STATE 3: Debate
// ────────────────────────────────────────────────

export type DebateSignal = "go" | "watch" | "out";
export type DebatePriority = "高" | "中" | "低";

export interface DebateVerdict {
  code: string;
  signal: DebateSignal;
  priority: DebatePriority;
  pro: string;
  con: string;
  cfNote: string;
}

export interface DebateResult {
  verdicts: DebateVerdict[];
}

// ────────────────────────────────────────────────
// STATE 4: Final Evaluation
// ────────────────────────────────────────────────

/** Individual dimension scores (each 1-5). */
export interface BestPickScores {
  macro: number;
  cf: number;
  value: number;
  momentum: number;
  riskScore: number;
}

/**
 * A top-ranked pick combining dimension scores with display data.
 * `rank` is 1-based (1 = best). `stars` is the overall 1-5 composite.
 */
export interface BestPick extends BestPickScores {
  rank: number;
  code: string;
  name: string;
  /** 1-5 overall composite rating */
  stars: number;
  fcfYield: string;
  cfMargin: string;
  cfTrend: CfTrend;
  risk1: string;
  risk2: string;
  hedge: string;
}

export type ReturnLevel = "高" | "中" | "低";
export type RiskLevel = "高" | "中" | "低";
export type CfEvaluation = "🟢" | "🟡" | "🔴";
export type PositionType = "コア" | "サテライト" | "ヘッジ";

export interface MatrixEntry {
  name: string;
  ret: ReturnLevel;
  risk: RiskLevel;
  cf: CfEvaluation;
  pos: PositionType;
  /** `true` when correlation with another holding is dangerously high */
  warn: boolean;
}

/** Target allocation percentages (should sum to 100). */
export interface AllocationConfig {
  stocks: number;
  funds: number;
  cash: number;
}

export interface CorrelationPair {
  a: string;
  b: string;
  /** Pearson correlation coefficient */
  coeff: number;
}

/** Aggregated output of the final evaluation stage. */
export interface FinalEvaluation {
  bestStocks: BestPick[];
  bestFunds: BestPick[];
  matrix: MatrixEntry[];
  alloc: AllocationConfig;
  corrMatrix: CorrelationPair[];
}

// ────────────────────────────────────────────────
// Pipeline State
// ────────────────────────────────────────────────

/** 0-indexed pipeline step (0 = macro, 1 = selection, 2 = debate, 3 = final). */
export type PipelineStep = 0 | 1 | 2 | 3;
export type PipelineStatus = "idle" | "running" | "done" | "error";
export type NavigatorAnalysisMode = "live" | "mock-fallback" | null;

export interface PipelineStepState {
  step: PipelineStep;
  label: string;
  status: "standby" | "running" | "done" | "error";
}

/** Top-level state for the navigator feature, consumed by the Zustand store. */
export interface NavigatorState {
  settings: NavigatorSettings | null;
  macro: MacroResult | null;
  stocks: StockSelectionResult | null;
  debate: DebateResult | null;
  final: FinalEvaluation | null;
  /** Data source mode for the latest successful run. */
  analysisMode: NavigatorAnalysisMode;
  /** Additional diagnostic detail from the latest failed run. */
  diagnosticMessage: string | null;
  status: PipelineStatus;
  currentStep: PipelineStep;
  steps: PipelineStepState[];
  /** Overall progress percentage (0-100). */
  progress: number;
  error: string | null;
  /** ISO-8601 timestamp of last successful execution. */
  executedAt: string | null;
}

// ────────────────────────────────────────────────
// Export / Import
// ────────────────────────────────────────────────

export interface NavigatorExport {
  version: string;
  exportedAt: string;
  settings: NavigatorSettings;
  data: {
    macro: MacroResult | null;
    stocks: StockSelectionResult | null;
    debate: DebateResult | null;
    final: FinalEvaluation | null;
  };
}

// ────────────────────────────────────────────────
// Default Constants
// ────────────────────────────────────────────────

export const DEFAULT_PIPELINE_STEPS: PipelineStepState[] = [
  { step: 0, label: "STATE 1 // market-intelligence research", status: "standby" },
  { step: 1, label: "STATE 2 // stock selection + CF analysis", status: "standby" },
  { step: 2, label: "STATE 3 // convergence-debate panel", status: "standby" },
  { step: 3, label: "STATE 4 // best3 + matrix generation", status: "standby" },
];

export const INITIAL_NAVIGATOR_STATE: NavigatorState = {
  settings: null,
  macro: null,
  stocks: null,
  debate: null,
  final: null,
  analysisMode: null,
  diagnosticMessage: null,
  status: "idle",
  currentStep: 0,
  steps: DEFAULT_PIPELINE_STEPS.map((s) => ({ ...s })),
  progress: 0,
  error: null,
  executedAt: null,
};

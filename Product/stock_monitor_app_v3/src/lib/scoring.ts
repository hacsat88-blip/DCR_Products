import { ScoringConfig, ScoreBreakdownItem } from "@/types/scoring";
import { Stock, StockAction, StockEvaluation } from "@/types/stock";

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  revenueGrowthThreshold: 15,
  revenueGrowthWeight: 15,
  opGrowthThreshold: 15,
  opGrowthWeight: 15,
  operatingCFBonus: 10,
  perPenaltyThreshold: 45,
  perPenaltyWeight: 10,
  dilutionPenalty: 12,
  oneOffProfitPenalty: 8
};

export const ACTION_RULES = {
  buyNowPerMax: 30,
  waitPullbackPerOverheat: 40,
  operatingCFDanger: -1000,
  pbrOverheat: 6,
  baseScore: 50,
  dividendBonus: 4,
  lowValuationPerMax: 20,
  lowValuationBonus: 5,
  negativeOperatingCFPenalty: 14,
  deepNegativeOperatingCFPenalty: 20,
  pbrPenalty: 8
} as const;

const SCORE_MIN = 0;
const SCORE_MAX = 100;

function hasKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function num(value: number | null | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function narrativeSummary(stock: Stock): string {
  return stock.summary ?? "";
}

function resolveRiskSignals(stock: Stock): { hasDilutionRisk: boolean; hasOneOffProfitRisk: boolean } {
  const mergedText = `${stock.riskSignal ?? ""} ${narrativeSummary(stock)}`;
  return {
    hasDilutionRisk: stock.hasDilutionRisk ?? hasKeyword(mergedText, ["希薄化"]),
    hasOneOffProfitRisk: stock.hasOneOffProfitRisk ?? hasKeyword(mergedText, ["一過性"])
  };
}

function inferAction(stock: Stock, config: ScoringConfig): StockAction {
  const revenueGrowth = num(stock.revenueGrowth, -Infinity);
  const opGrowth = num(stock.opGrowth, -Infinity);
  const operatingCF = num(stock.operatingCF, -Infinity);
  const per = num(stock.per, Infinity);
  const { hasDilutionRisk } = resolveRiskSignals(stock);

  if (operatingCF <= ACTION_RULES.operatingCFDanger || hasDilutionRisk) {
    return "exclude";
  }

  if (
    revenueGrowth > config.revenueGrowthThreshold &&
    opGrowth > config.opGrowthThreshold &&
    operatingCF > 0 &&
    per <= ACTION_RULES.buyNowPerMax
  ) {
    return "buy_now";
  }

  if (
    revenueGrowth > config.revenueGrowthThreshold &&
    opGrowth > config.opGrowthThreshold &&
    per > ACTION_RULES.waitPullbackPerOverheat
  ) {
    return "wait_pullback";
  }

  return "wait_earnings";
}

function buildSummary(stock: Stock, action: StockAction, config: ScoringConfig): string {
  const { hasOneOffProfitRisk } = resolveRiskSignals(stock);
  if (action === "buy_now") {
    return "成長率と営業CFが揃い、過熱PERを避けた買い条件に合致しています。";
  }
  if (action === "wait_pullback") {
    return "成長は強い一方で評価倍率が先行しているため、押し目待ち判定です。";
  }
  if (action === "exclude") {
    return "営業CFの悪化または希薄化リスクが強く、除外判定です。";
  }
  const hints: string[] = [];
  if (num(stock.revenueGrowth, 0) <= config.revenueGrowthThreshold) {
    hints.push("売上成長の確認");
  }
  if (num(stock.opGrowth, 0) <= config.opGrowthThreshold) {
    hints.push("利益成長の確認");
  }
  if (num(stock.per, 0) > ACTION_RULES.buyNowPerMax) {
    hints.push("バリュエーション調整");
  }
  if (narrativeSummary(stock).includes("M&A") || hasOneOffProfitRisk) {
    hints.push("一過性要因の分解");
  }
  return hints.length > 0
    ? `${hints.join("・")}を次回決算で確認する段階です。`
    : "成長と収益の持続性を決算で確認する段階です。";
}

function addBreakdownItem(
  list: ScoreBreakdownItem[],
  item: Omit<ScoreBreakdownItem, "id">
): void {
  list.push({
    id: `${item.type}-${list.length + 1}`,
    ...item
  });
}

export function evaluateStock(stock: Stock, config: ScoringConfig = DEFAULT_SCORING_CONFIG): StockEvaluation {
  const action = inferAction(stock, config);
  const { hasDilutionRisk, hasOneOffProfitRisk } = resolveRiskSignals(stock);
  const breakdown: ScoreBreakdownItem[] = [];

  let score = ACTION_RULES.baseScore;
  addBreakdownItem(breakdown, {
    label: "基準点",
    type: "bonus",
    value: ACTION_RULES.baseScore,
    reason: "比較しやすくするため全銘柄に同じ基準点を付与"
  });

  if (num(stock.revenueGrowth, 0) > config.revenueGrowthThreshold) {
    score += config.revenueGrowthWeight;
    addBreakdownItem(breakdown, {
      label: "売上成長ボーナス",
      type: "bonus",
      value: config.revenueGrowthWeight,
      reason: `revenueGrowth > ${config.revenueGrowthThreshold}`
    });
  }

  if (num(stock.opGrowth, 0) > config.opGrowthThreshold) {
    score += config.opGrowthWeight;
    addBreakdownItem(breakdown, {
      label: "営業利益成長ボーナス",
      type: "bonus",
      value: config.opGrowthWeight,
      reason: `opGrowth > ${config.opGrowthThreshold}`
    });
  }

  if (num(stock.operatingCF, 0) > 0) {
    score += config.operatingCFBonus;
    addBreakdownItem(breakdown, {
      label: "営業CFボーナス",
      type: "bonus",
      value: config.operatingCFBonus,
      reason: "operatingCF > 0"
    });
  }

  if (num(stock.dividendYield, 0) > 0) {
    score += ACTION_RULES.dividendBonus;
    addBreakdownItem(breakdown, {
      label: "配当ボーナス",
      type: "bonus",
      value: ACTION_RULES.dividendBonus,
      reason: "dividendYield > 0"
    });
  }

  if (num(stock.per, Infinity) <= ACTION_RULES.lowValuationPerMax) {
    score += ACTION_RULES.lowValuationBonus;
    addBreakdownItem(breakdown, {
      label: "低PERボーナス",
      type: "bonus",
      value: ACTION_RULES.lowValuationBonus,
      reason: `PER <= ${ACTION_RULES.lowValuationPerMax}`
    });
  }

  if (num(stock.per, 0) > config.perPenaltyThreshold) {
    score -= config.perPenaltyWeight;
    addBreakdownItem(breakdown, {
      label: "PER過熱ペナルティ",
      type: "penalty",
      value: -config.perPenaltyWeight,
      reason: `PER > ${config.perPenaltyThreshold}`
    });
  }

  if (num(stock.pbr, 0) > ACTION_RULES.pbrOverheat) {
    score -= ACTION_RULES.pbrPenalty;
    addBreakdownItem(breakdown, {
      label: "PBR過熱ペナルティ",
      type: "penalty",
      value: -ACTION_RULES.pbrPenalty,
      reason: `PBR > ${ACTION_RULES.pbrOverheat}`
    });
  }

  if (num(stock.operatingCF, 0) < 0) {
    score -= ACTION_RULES.negativeOperatingCFPenalty;
    addBreakdownItem(breakdown, {
      label: "営業CFマイナスペナルティ",
      type: "penalty",
      value: -ACTION_RULES.negativeOperatingCFPenalty,
      reason: "operatingCF < 0"
    });
  }

  if (num(stock.operatingCF, 0) <= ACTION_RULES.operatingCFDanger) {
    score -= ACTION_RULES.deepNegativeOperatingCFPenalty;
    addBreakdownItem(breakdown, {
      label: "営業CF深刻悪化ペナルティ",
      type: "penalty",
      value: -ACTION_RULES.deepNegativeOperatingCFPenalty,
      reason: `operatingCF <= ${ACTION_RULES.operatingCFDanger}`
    });
  }

  if (hasDilutionRisk) {
    score -= config.dilutionPenalty;
    addBreakdownItem(breakdown, {
      label: "希薄化リスクペナルティ",
      type: "penalty",
      value: -config.dilutionPenalty,
      reason: "hasDilutionRisk = true"
    });
  }

  if (hasOneOffProfitRisk) {
    score -= config.oneOffProfitPenalty;
    addBreakdownItem(breakdown, {
      label: "一過性利益依存ペナルティ",
      type: "penalty",
      value: -config.oneOffProfitPenalty,
      reason: "hasOneOffProfitRisk = true"
    });
  }

  const riskFlags = [
    num(stock.per, 0) > config.perPenaltyThreshold ? "PER過熱" : "",
    hasDilutionRisk ? "希薄化懸念" : "",
    hasOneOffProfitRisk ? "一過性利益依存" : ""
  ].filter(Boolean);

  const normalizedScore = Math.max(SCORE_MIN, Math.min(SCORE_MAX, score));
  const scoreSummary = buildSummary(stock, action, config);

  return {
    score: normalizedScore,
    evaluatedAction: action,
    breakdown,
    scoreSummary,
    actionReason: scoreSummary,
    riskFlags
  };
}

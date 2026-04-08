import { describe, it, expect } from "vitest";
import { evaluateStock, DEFAULT_SCORING_CONFIG, ACTION_RULES } from "@/lib/scoring";
import type { Stock } from "@/types/stock";
import type { ScoringConfig } from "@/types/scoring";

function makeStock(overrides: Partial<Stock> = {}): Stock {
  return {
    id: "test-1",
    code: "9999",
    name: "テスト株式会社",
    sector: "IT",
    themeTags: [],
    price: 1000,
    changePercent: 1.5,
    marketCap: 50_000_000_000,
    per: 20,
    pbr: 2.0,
    dividendYield: 1.5,
    revenueGrowth: 20,
    opGrowth: 25,
    operatingCF: 500,
    oneLiner: "テスト用銘柄",
    summary: "テスト用サマリー",
    coreKpiLabel: "売上成長率",
    coreKpiValue: "20%",
    riskSignal: "",
    collapseCondition: "",
    chartData: [],
    ...overrides,
  };
}

describe("evaluateStock", () => {
  describe("action inference", () => {
    it("returns buy_now when growth and CF are strong with low PER", () => {
      const stock = makeStock({
        revenueGrowth: 20,
        opGrowth: 20,
        operatingCF: 1000,
        per: 25,
      });
      const result = evaluateStock(stock);
      expect(result.evaluatedAction).toBe("buy_now");
    });

    it("returns wait_pullback when growth is strong but PER is overheated", () => {
      const stock = makeStock({
        revenueGrowth: 20,
        opGrowth: 20,
        operatingCF: 1000,
        per: 50,
      });
      const result = evaluateStock(stock);
      expect(result.evaluatedAction).toBe("wait_pullback");
    });

    it("returns exclude when operatingCF is dangerously negative", () => {
      const stock = makeStock({ operatingCF: -2000 });
      const result = evaluateStock(stock);
      expect(result.evaluatedAction).toBe("exclude");
    });

    it("does not return exclude when operatingCF is null", () => {
      const stock = makeStock({
        revenueGrowth: 20,
        opGrowth: 20,
        operatingCF: null,
        per: 25,
      });
      const result = evaluateStock(stock);
      expect(result.evaluatedAction).toBe("wait_earnings");
    });

    it("does not return exclude when operatingCF is undefined", () => {
      const stock = makeStock({
        revenueGrowth: 20,
        opGrowth: 20,
        operatingCF: undefined,
        per: 25,
      });
      const result = evaluateStock(stock);
      expect(result.evaluatedAction).toBe("wait_earnings");
    });

    it("returns exclude when dilution risk flag is set", () => {
      const stock = makeStock({ hasDilutionRisk: true });
      const result = evaluateStock(stock);
      expect(result.evaluatedAction).toBe("exclude");
    });

    it("returns exclude when dilution risk is detected from riskSignal text", () => {
      const stock = makeStock({ riskSignal: "希薄化の可能性あり" });
      const result = evaluateStock(stock);
      expect(result.evaluatedAction).toBe("exclude");
    });

    it("returns wait_earnings when growth is moderate", () => {
      const stock = makeStock({
        revenueGrowth: 10,
        opGrowth: 10,
        operatingCF: 500,
        per: 25,
      });
      const result = evaluateStock(stock);
      expect(result.evaluatedAction).toBe("wait_earnings");
    });

    it("returns wait_earnings when only revenue growth is strong", () => {
      const stock = makeStock({
        revenueGrowth: 20,
        opGrowth: 5,
        operatingCF: 500,
        per: 20,
      });
      const result = evaluateStock(stock);
      expect(result.evaluatedAction).toBe("wait_earnings");
    });
  });

  describe("score calculation", () => {
    it("starts from base score of 50", () => {
      const stock = makeStock({
        revenueGrowth: 0,
        opGrowth: 0,
        operatingCF: 0,
        per: 25,
        pbr: 1.0,
        dividendYield: 0,
      });
      const result = evaluateStock(stock);
      expect(result.breakdown[0].label).toBe("基準点");
      expect(result.breakdown[0].value).toBe(ACTION_RULES.baseScore);
    });

    it("adds revenue growth bonus when above threshold", () => {
      const stock = makeStock({ revenueGrowth: 20 });
      const result = evaluateStock(stock);
      const bonus = result.breakdown.find((b) => b.label === "売上成長ボーナス");
      expect(bonus).toBeDefined();
      expect(bonus!.value).toBe(DEFAULT_SCORING_CONFIG.revenueGrowthWeight);
    });

    it("adds operating profit growth bonus when above threshold", () => {
      const stock = makeStock({ opGrowth: 20 });
      const result = evaluateStock(stock);
      const bonus = result.breakdown.find((b) => b.label === "営業利益成長ボーナス");
      expect(bonus).toBeDefined();
      expect(bonus!.value).toBe(DEFAULT_SCORING_CONFIG.opGrowthWeight);
    });

    it("adds operating CF bonus when positive", () => {
      const stock = makeStock({ operatingCF: 500 });
      const result = evaluateStock(stock);
      const bonus = result.breakdown.find((b) => b.label === "営業CFボーナス");
      expect(bonus).toBeDefined();
      expect(bonus!.value).toBe(DEFAULT_SCORING_CONFIG.operatingCFBonus);
    });

    it("adds dividend bonus when dividendYield > 0", () => {
      const stock = makeStock({ dividendYield: 2.0 });
      const result = evaluateStock(stock);
      const bonus = result.breakdown.find((b) => b.label === "配当ボーナス");
      expect(bonus).toBeDefined();
      expect(bonus!.value).toBe(ACTION_RULES.dividendBonus);
    });

    it("adds low PER bonus when PER <= 20", () => {
      const stock = makeStock({ per: 15 });
      const result = evaluateStock(stock);
      const bonus = result.breakdown.find((b) => b.label === "低PERボーナス");
      expect(bonus).toBeDefined();
      expect(bonus!.value).toBe(ACTION_RULES.lowValuationBonus);
    });

    it("applies PER overheated penalty when PER > threshold", () => {
      const stock = makeStock({ per: 50 });
      const result = evaluateStock(stock);
      const penalty = result.breakdown.find((b) => b.label === "PER過熱ペナルティ");
      expect(penalty).toBeDefined();
      expect(penalty!.value).toBe(-DEFAULT_SCORING_CONFIG.perPenaltyWeight);
    });

    it("applies PBR overheated penalty when PBR > 6", () => {
      const stock = makeStock({ pbr: 8 });
      const result = evaluateStock(stock);
      const penalty = result.breakdown.find((b) => b.label === "PBR過熱ペナルティ");
      expect(penalty).toBeDefined();
      expect(penalty!.value).toBe(-ACTION_RULES.pbrPenalty);
    });

    it("applies negative operating CF penalty", () => {
      const stock = makeStock({ operatingCF: -100 });
      const result = evaluateStock(stock);
      const penalty = result.breakdown.find((b) => b.label === "営業CFマイナスペナルティ");
      expect(penalty).toBeDefined();
      expect(penalty!.value).toBe(-ACTION_RULES.negativeOperatingCFPenalty);
    });

    it("applies deep negative CF penalty when CF <= danger threshold", () => {
      const stock = makeStock({ operatingCF: -2000 });
      const result = evaluateStock(stock);
      const penalty = result.breakdown.find(
        (b) => b.label === "営業CF深刻悪化ペナルティ"
      );
      expect(penalty).toBeDefined();
      expect(penalty!.value).toBe(-ACTION_RULES.deepNegativeOperatingCFPenalty);
    });

    it("applies dilution risk penalty", () => {
      const stock = makeStock({ hasDilutionRisk: true });
      const result = evaluateStock(stock);
      const penalty = result.breakdown.find((b) => b.label === "希薄化リスクペナルティ");
      expect(penalty).toBeDefined();
      expect(penalty!.value).toBe(-DEFAULT_SCORING_CONFIG.dilutionPenalty);
    });

    it("applies one-off profit penalty", () => {
      const stock = makeStock({ hasOneOffProfitRisk: true });
      const result = evaluateStock(stock);
      const penalty = result.breakdown.find(
        (b) => b.label === "一過性利益依存ペナルティ"
      );
      expect(penalty).toBeDefined();
      expect(penalty!.value).toBe(-DEFAULT_SCORING_CONFIG.oneOffProfitPenalty);
    });
  });

  describe("score normalization", () => {
    it("clamps score to 0 minimum", () => {
      const stock = makeStock({
        revenueGrowth: 0,
        opGrowth: 0,
        operatingCF: -2000,
        per: 50,
        pbr: 8,
        hasDilutionRisk: true,
        hasOneOffProfitRisk: true,
        dividendYield: 0,
      });
      const result = evaluateStock(stock);
      expect(result.score).toBe(0);
    });

    it("clamps score to 100 maximum", () => {
      const stock = makeStock({
        revenueGrowth: 50,
        opGrowth: 50,
        operatingCF: 5000,
        per: 10,
        pbr: 1.0,
        dividendYield: 3.0,
      });
      const result = evaluateStock(stock);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe("edge cases", () => {
    it("handles null growth values gracefully", () => {
      const stock = makeStock({
        revenueGrowth: null,
        opGrowth: null,
        operatingCF: null,
        per: null,
        pbr: null,
        dividendYield: null,
      });
      const result = evaluateStock(stock);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.evaluatedAction).toBeDefined();
    });

    it("detects one-off profit risk from summary text", () => {
      const stock = makeStock({ summary: "一過性の利益が含まれる" });
      const result = evaluateStock(stock);
      const penalty = result.breakdown.find(
        (b) => b.label === "一過性利益依存ペナルティ"
      );
      expect(penalty).toBeDefined();
    });

    it("populates riskFlags for overheated PER", () => {
      const stock = makeStock({ per: 50 });
      const result = evaluateStock(stock);
      expect(result.riskFlags).toContain("PER過熱");
    });

    it("populates riskFlags for dilution risk", () => {
      const stock = makeStock({ hasDilutionRisk: true });
      const result = evaluateStock(stock);
      expect(result.riskFlags).toContain("希薄化懸念");
    });

    it("uses custom scoring config", () => {
      const config: ScoringConfig = {
        ...DEFAULT_SCORING_CONFIG,
        revenueGrowthThreshold: 30,
      };
      const stock = makeStock({ revenueGrowth: 20 });
      const result = evaluateStock(stock, config);
      const bonus = result.breakdown.find((b) => b.label === "売上成長ボーナス");
      expect(bonus).toBeUndefined();
    });

    it("returns a scoreSummary string", () => {
      const stock = makeStock();
      const result = evaluateStock(stock);
      expect(result.scoreSummary).toBeTruthy();
      expect(typeof result.scoreSummary).toBe("string");
    });
  });
});

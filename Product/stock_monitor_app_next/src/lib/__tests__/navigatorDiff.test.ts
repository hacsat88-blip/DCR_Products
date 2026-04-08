import { describe, expect, it } from "vitest";

import type { FinalEvaluation } from "@/types/navigator";
import {
  buildRecommendationBaseline,
  buildRecommendationDiffs,
  formatRecommendationDiffBadge,
} from "@/lib/navigatorDiff";

function createFinal(bestStocks: FinalEvaluation["bestStocks"]): FinalEvaluation {
  return {
    bestStocks,
    bestFunds: [],
    matrix: [],
    alloc: { stocks: 60, funds: 30, cash: 10 },
    corrMatrix: [],
  };
}

describe("navigatorDiff", () => {
  it("builds rank/star diffs against previous recommendations", () => {
    const previous = createFinal([
      {
        rank: 1,
        code: "AAA",
        name: "Alpha",
        stars: 4,
        fcfYield: "4%",
        cfMargin: "10%",
        cfTrend: "↑",
        risk1: "r1",
        risk2: "r2",
        hedge: "h",
        macro: 4,
        cf: 4,
        value: 3,
        momentum: 4,
        riskScore: 3,
      },
      {
        rank: 2,
        code: "BBB",
        name: "Beta",
        stars: 3,
        fcfYield: "3%",
        cfMargin: "8%",
        cfTrend: "→",
        risk1: "r1",
        risk2: "r2",
        hedge: "h",
        macro: 3,
        cf: 3,
        value: 3,
        momentum: 3,
        riskScore: 3,
      },
    ]);
    const next = createFinal([
      {
        rank: 1,
        code: "BBB",
        name: "Beta",
        stars: 4,
        fcfYield: "3%",
        cfMargin: "8%",
        cfTrend: "→",
        risk1: "r1",
        risk2: "r2",
        hedge: "h",
        macro: 3,
        cf: 3,
        value: 3,
        momentum: 3,
        riskScore: 3,
      },
      {
        rank: 2,
        code: "CCC",
        name: "Gamma",
        stars: 5,
        fcfYield: "5%",
        cfMargin: "12%",
        cfTrend: "↗",
        risk1: "r1",
        risk2: "r2",
        hedge: "h",
        macro: 5,
        cf: 4,
        value: 4,
        momentum: 5,
        riskScore: 2,
      },
    ]);

    const baseline = buildRecommendationBaseline(previous);
    const diffs = buildRecommendationDiffs(next, baseline);

    expect(diffs.BBB).toMatchObject({ isNew: false, rankDelta: 1, starDelta: 1 });
    expect(diffs.CCC).toMatchObject({ isNew: true, rankDelta: 0, starDelta: 0 });
  });

  it("formats compact diff badge labels", () => {
    expect(formatRecommendationDiffBadge({ isNew: false, rankDelta: 1, starDelta: 1 })).toBe("↑+1★");
    expect(formatRecommendationDiffBadge({ isNew: true, rankDelta: 0, starDelta: 0 })).toBe("NEW");
  });
});

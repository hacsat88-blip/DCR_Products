import type {
  FinalEvaluation,
  RecommendationDiff,
  RecommendationDiffMap,
} from "@/types/navigator";

interface RecommendationBaselineEntry {
  rank: number;
  stars: number;
}

export type RecommendationBaseline = Record<string, RecommendationBaselineEntry>;

function flattenPicks(finalEval: FinalEvaluation): FinalEvaluation["bestStocks"] {
  return [...finalEval.bestStocks, ...finalEval.bestFunds];
}

export function buildRecommendationBaseline(finalEval: FinalEvaluation | null): RecommendationBaseline {
  if (!finalEval) return {};
  return flattenPicks(finalEval).reduce<RecommendationBaseline>((acc, pick) => {
    acc[pick.code] = { rank: pick.rank, stars: pick.stars };
    return acc;
  }, {});
}

export function buildRecommendationDiffs(
  finalEval: FinalEvaluation,
  baseline: RecommendationBaseline,
): RecommendationDiffMap {
  if (Object.keys(baseline).length === 0) return {};
  return flattenPicks(finalEval).reduce<RecommendationDiffMap>((acc, pick) => {
    const prev = baseline[pick.code];
    if (!prev) {
      acc[pick.code] = { isNew: true, rankDelta: 0, starDelta: 0 };
      return acc;
    }

    acc[pick.code] = {
      isNew: false,
      rankDelta: prev.rank - pick.rank,
      starDelta: pick.stars - prev.stars,
    };
    return acc;
  }, {});
}

export function formatRecommendationDiffBadge(diff: RecommendationDiff): string {
  if (diff.isNew) return "NEW";
  const rankArrow = diff.rankDelta > 0 ? "↑" : diff.rankDelta < 0 ? "↓" : "→";
  if (diff.starDelta === 0) {
    return diff.rankDelta === 0 ? "→" : `${rankArrow}${Math.abs(diff.rankDelta)}`;
  }
  const starText = `${diff.starDelta > 0 ? "+" : ""}${diff.starDelta}★`;
  return `${rankArrow}${starText}`;
}

import { getDb } from "@/lib/db/client";
import { createJQuantsClient } from "@/lib/providers/jquants";
import { createAlphaVantageClient } from "@/lib/providers/alphaVantage";
import {
  screenCandidates,
  type ScreenerDeps,
  type ScreenerRequest,
  DISCLAIMER_TEXT,
} from "@/lib/services/analysis/screener";
import type { StockAnalysis } from "@/lib/llm/schemas";

export { DISCLAIMER_TEXT };

export interface PickRow {
  symbol: string;
  market: "JP" | "US";
  name: string;
  price: number;
  currency: "JPY" | "USD";
  analysis?: StockAnalysis;
}

export interface PicksResponse {
  items: PickRow[];
  warnings: string[];
  asOf: string;
  disclaimer: string;
}

export const DEFAULT_PICKS_REQUEST: ScreenerRequest = {
  market: "BOTH",
  priceMin: 50,
  priceMax: 50000,
  style: "総合",
  riskTolerance: "mid",
  limit: 6,
  poolLimit: 12,
  theme: null,
};

export function resolveDefaultDeps(): ScreenerDeps {
  const out: ScreenerDeps = { db: getDb() };
  try {
    out.jp = { jquants: createJQuantsClient() };
  } catch {
    // jquants 未設定 → JP プールスキップ
  }
  try {
    out.us = { alphaVantage: createAlphaVantageClient() };
  } catch {
    // alpha vantage 未設定 → US プールスキップ
  }
  return out;
}

export async function buildPicks(
  deps: ScreenerDeps = {},
  req: ScreenerRequest = DEFAULT_PICKS_REQUEST,
): Promise<PicksResponse> {
  const result = await screenCandidates(req, deps);
  const analysisByCode = new Map(result.analyses.map((a) => [a.code, a]));
  const items: PickRow[] = [];
  const seen = new Set<string>();
  for (const c of result.candidates) {
    const a = analysisByCode.get(c.code);
    if (!a) continue;
    if (seen.has(c.code)) continue;
    seen.add(c.code);
    items.push({
      symbol: c.code,
      market: c.market,
      name: c.name,
      price: c.price,
      currency: c.currency,
      analysis: a,
    });
  }
  if (items.length < req.limit) {
    for (const c of result.candidates) {
      if (items.length >= req.limit) break;
      if (seen.has(c.code)) continue;
      seen.add(c.code);
      items.push({
        symbol: c.code,
        market: c.market,
        name: c.name,
        price: c.price,
        currency: c.currency,
      });
    }
  }
  return {
    items: items.slice(0, req.limit),
    warnings: result.warnings,
    asOf: new Date().toISOString(),
    disclaimer: DISCLAIMER_TEXT,
  };
}

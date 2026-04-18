import { z } from "zod";

const ScenarioLeg = z.object({
  up: z.string(),
  mid: z.string(),
  down: z.string(),
  confidence: z.enum(["high", "mid", "low"]),
  evidence: z.enum(["A", "B", "C"]),
});

export const StockAnalysisSchema = z.object({
  code: z.string(),
  name: z.string(),
  scores: z.object({
    a: z.number().min(0).max(100),
    b: z.number().min(0).max(100),
    c: z.number().min(0).max(100),
    d: z.number().min(0).max(100),
    e: z.number().min(0).max(100),
  }),
  totalScore: z.number().min(0).max(100),
  scenarios: z.object({
    short: ScenarioLeg,
    mid: ScenarioLeg,
    long: ScenarioLeg,
  }),
  risks: z.array(z.string()),
  catalysts: z.array(z.string()),
  unknowns: z.array(z.string()),
});
export type StockAnalysis = z.infer<typeof StockAnalysisSchema>;

export const NewsSummaryItemSchema = z.object({
  title: z.string(),
  summary: z.string(),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  sectors: z.array(z.string()).max(3),
});

export const NewsSummarySchema = z.object({
  items: z.array(NewsSummaryItemSchema).min(1).max(5),
});
export type NewsSummary = z.infer<typeof NewsSummarySchema>;

export const IntentSchema = z.object({
  market: z.enum(["JP", "US", "BOTH"]),
  priceRangeMin: z.number().nullable(),
  priceRangeMax: z.number().nullable(),
  currency: z.enum(["JPY", "USD"]),
  theme: z.string().nullable(),
  style: z.enum(["短期値幅狙い", "中期テーマ", "長期成長", "配当重視", "総合"]),
  riskTolerance: z.enum(["low", "mid", "high"]),
});
export type Intent = z.infer<typeof IntentSchema>;

export const MarketAnomalySchema = z.object({
  signal: z.enum(["🟢", "🟡", "🔴"]),
  level: z.enum(["normal", "caution", "storm"]),
  reasons: z.array(z.string()),
  recommendedAction: z.string(),
});
export type MarketAnomaly = z.infer<typeof MarketAnomalySchema>;

import { z } from "zod";
import type { Database } from "@/lib/db/client";
import {
  getLlmCache,
  setLlmCache,
} from "@/lib/db/repositories/llmCacheRepo";
import {
  analyzeStock,
  reasoningModel,
  type RouterCallOptions,
} from "@/lib/llm/router";
import {
  StockAnalysisSchema,
  type StockAnalysis,
} from "@/lib/llm/schemas";
import {
  fetchJpCandidates,
  fetchUsCandidates,
  type Candidate,
  type JpCandidateDeps,
  type UsCandidateDeps,
} from "./candidatePool";

export const ScreenerStyleSchema = z.enum([
  "短期値幅狙い",
  "中期テーマ",
  "長期成長",
  "配当重視",
  "総合",
]);
export type ScreenerStyle = z.infer<typeof ScreenerStyleSchema>;

export const ScreenerRequestSchema = z
  .object({
    market: z.enum(["JP", "US", "BOTH"]),
    priceMin: z.number().min(0),
    priceMax: z.number().positive(),
    currency: z.enum(["JPY", "USD"]).optional(),
    style: ScreenerStyleSchema.default("総合"),
    riskTolerance: z.enum(["low", "mid", "high"]).default("mid"),
    theme: z.string().max(200).nullable().optional(),
    limit: z.number().int().min(1).max(20).default(5),
    /** プールから LLM に送る上限 (default 20) */
    poolLimit: z.number().int().min(1).max(50).default(20),
  })
  .refine(
    (v) => {
      const max = v.market === "US" ? 1000 : 100000;
      return v.priceMax <= max && v.priceMin <= v.priceMax;
    },
    {
      message: "priceMax exceeds market limit or priceMin > priceMax",
      path: ["priceMax"],
    },
  );

export type ScreenerRequest = z.infer<typeof ScreenerRequestSchema>;

export interface ScreenerDeps {
  db?: Database;
  jp?: JpCandidateDeps;
  us?: UsCandidateDeps;
  llmOptions?: RouterCallOptions;
  /** 主に試験用 - LLM 呼び出しを差し替える */
  analyze?: typeof analyzeStock;
  /** キャッシュ key 用日付 (YYYY-MM-DD)。default = today UTC */
  today?: () => string;
}

export interface ScreenerResult {
  analyses: StockAnalysis[];
  candidates: Candidate[];
  cacheHits: number;
  cacheMisses: number;
  warnings: string[];
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function todayUtc(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function rangeKey(req: ScreenerRequest): string {
  return `${req.priceMin}-${req.priceMax}`;
}

function cacheKey(args: {
  market: "JP" | "US";
  code: string;
  range: string;
  style: string;
  date: string;
}): string {
  return `analyze:${args.market}:${args.code}:${args.range}:${args.style}:${args.date}`;
}

async function gatherCandidates(
  req: ScreenerRequest,
  deps: ScreenerDeps,
): Promise<Candidate[]> {
  const filters = {
    priceMin: req.priceMin,
    priceMax: req.priceMax,
    limit: req.poolLimit,
  };
  const tasks: Promise<Candidate[]>[] = [];
  if ((req.market === "JP" || req.market === "BOTH") && deps.jp) {
    tasks.push(
      fetchJpCandidates(deps.jp, filters).catch(() => [] as Candidate[]),
    );
  }
  if ((req.market === "US" || req.market === "BOTH") && deps.us) {
    tasks.push(
      fetchUsCandidates(deps.us, filters).catch(() => [] as Candidate[]),
    );
  }
  const results = await Promise.all(tasks);
  return results.flat();
}

export async function screenCandidates(
  req: ScreenerRequest,
  deps: ScreenerDeps = {},
): Promise<ScreenerResult> {
  const today = (deps.today ?? todayUtc)();
  const range = rangeKey(req);
  const warnings: string[] = [];
  const analyzeFn = deps.analyze ?? analyzeStock;

  const candidates = await gatherCandidates(req, deps);
  if (candidates.length === 0) {
    return {
      analyses: [],
      candidates: [],
      cacheHits: 0,
      cacheMisses: 0,
      warnings: ["価格レンジに合致する候補が見つかりませんでした。"],
    };
  }

  // pre-screen: 出来高でソート → 上位 poolLimit
  const pool = candidates.slice(0, req.poolLimit);

  let cacheHits = 0;
  let cacheMisses = 0;
  const analyses: StockAnalysis[] = [];

  for (const c of pool) {
    const key = cacheKey({
      market: c.market,
      code: c.code,
      range,
      style: req.style,
      date: today,
    });

    let analysis: StockAnalysis | null = null;
    if (deps.db) {
      const hit = getLlmCache(deps.db, key);
      if (hit) {
        try {
          analysis = StockAnalysisSchema.parse(JSON.parse(hit.payload));
          cacheHits++;
        } catch {
          analysis = null;
        }
      }
    }

    if (!analysis) {
      cacheMisses++;
      try {
        const raw = await analyzeFn(
          {
            code: c.code,
            name: c.name,
            market: c.market,
            priceContext: `現値: ${c.price} ${c.currency} / 出来高: ${c.volume ?? "Unknown"} / レンジ: ${req.priceMin}-${req.priceMax}`,
            style: req.style,
            riskTolerance: req.riskTolerance,
          },
          deps.llmOptions,
        );
        analysis = StockAnalysisSchema.parse(raw);
        if (deps.db) {
          setLlmCache(deps.db, {
            key,
            model: reasoningModel(),
            payload: JSON.stringify(analysis),
            ttlMs: CACHE_TTL_MS,
          });
        }
      } catch (err) {
        warnings.push(
          `${c.code} の分析に失敗しました: ${err instanceof Error ? err.message : String(err)}`,
        );
        analysis = null;
      }
    }

    if (analysis) analyses.push(analysis);
  }

  analyses.sort((a, b) => b.totalScore - a.totalScore);

  return {
    analyses: analyses.slice(0, req.limit),
    candidates: pool,
    cacheHits,
    cacheMisses,
    warnings,
  };
}

export const DISCLAIMER_TEXT =
  "本サイトは情報提供のみを目的としており、特定銘柄の売買を推奨するものではありません。最終的な投資判断はご自身の責任で行ってください。(v4.1 BOUNDARY)";

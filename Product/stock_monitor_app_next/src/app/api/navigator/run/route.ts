import { NextRequest, NextResponse } from "next/server";

import type {
  NavigatorSettings,
  MacroResult,
  StockSelectionResult,
  DebateResult,
  FinalEvaluation,
  PipelineStep,
  NavigatorRetryState,
} from "@/types/navigator";
import {
  DEFAULT_GEMINI_RATE_LIMIT_COOLDOWN_SECONDS,
  isGeminiRateLimitError,
  runMacroResearch,
  runStockSelection,
  runDebate,
  runFinalEvaluation,
} from "@/services/gemini";
import { fetchMacroMarketData, fetchStockFundamentals } from "@/services/marketDataFetcher";

// ── Types ───────────────────────────────────────

interface RunRequestBody {
  step: PipelineStep;
  settings: NavigatorSettings;
  freeInput?: string;
  macro?: MacroResult;
  stocks?: StockSelectionResult;
  debate?: DebateResult;
}

type StepResult =
  | MacroResult
  | StockSelectionResult
  | DebateResult
  | FinalEvaluation;

interface RunResponse {
  result: StepResult | null;
  error: string | null;
  mock?: boolean;
  retry?: NavigatorRetryState;
}

const CF_TRENDS = new Set(["↑", "↗", "→", "↘", "↓"]);
const STOCK_TYPES = new Set(["stock", "etf", "fund"]);
const DEBATE_SIGNALS = new Set(["go", "watch", "out"]);
const DEBATE_PRIORITIES = new Set(["高", "中", "低"]);
const MARKET_ENVIRONMENTS = new Set(["bullish", "neutral", "bearish"]);
const RISK_TRENDS = new Set(["↑", "→", "↓"]);
const LEVELS = new Set(["高", "中", "低"]);
const CF_EVAL = new Set(["🟢", "🟡", "🔴"]);
const POSITION_TYPES = new Set(["コア", "サテライト", "ヘッジ"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidPercent(value: unknown): boolean {
  return value === undefined || (isFiniteNumber(value) && value >= 0 && value <= 100);
}

function isMacroResult(value: unknown): value is MacroResult {
  if (!isRecord(value)) return false;
  if (!MARKET_ENVIRONMENTS.has(String(value.environment))) return false;
  if (!isString(value.label)) return false;
  if (!(value.chain === null || isString(value.chain))) return false;
  if (!Array.isArray(value.sectors) || !Array.isArray(value.risks)) return false;

  const sectorsValid = value.sectors.every(
    (s) => isRecord(s) && isString(s.name) && isString(s.reason),
  );
  if (!sectorsValid) return false;

  return value.risks.every(
    (r) =>
      isRecord(r) &&
      isString(r.name) &&
      isFiniteNumber(r.stars) &&
      RISK_TRENDS.has(String(r.trend)),
  );
}

function isStockSelectionResult(value: unknown): value is StockSelectionResult {
  if (!isRecord(value) || !Array.isArray(value.stocks)) return false;
  return value.stocks.every(
    (s) =>
      isRecord(s) &&
      isString(s.code) &&
      isString(s.name) &&
      isString(s.price) &&
      isString(s.fcfYield) &&
      isString(s.cfMargin) &&
      CF_TRENDS.has(String(s.cfTrend)) &&
      isString(s.sector) &&
      STOCK_TYPES.has(String(s.type)) &&
      isString(s.reason),
  );
}

function isDebateResult(value: unknown): value is DebateResult {
  if (!isRecord(value) || !Array.isArray(value.verdicts)) return false;
  return value.verdicts.every(
    (v) =>
      isRecord(v) &&
      isString(v.code) &&
      DEBATE_SIGNALS.has(String(v.signal)) &&
      DEBATE_PRIORITIES.has(String(v.priority)) &&
      isValidPercent(v.confidence) &&
      isString(v.pro) &&
      isString(v.con) &&
      isString(v.cfNote),
  );
}

function isFinalEvaluation(value: unknown): value is FinalEvaluation {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.bestStocks) || !Array.isArray(value.bestFunds)) return false;
  if (!Array.isArray(value.matrix) || !Array.isArray(value.corrMatrix)) return false;
  if (!isRecord(value.alloc)) return false;

  const picksValid = [...value.bestStocks, ...value.bestFunds].every(
    (p) =>
      isRecord(p) &&
      isFiniteNumber(p.rank) &&
      isString(p.code) &&
      isString(p.name) &&
      isFiniteNumber(p.stars) &&
      isString(p.fcfYield) &&
      isString(p.cfMargin) &&
      CF_TRENDS.has(String(p.cfTrend)) &&
      isString(p.risk1) &&
      isString(p.risk2) &&
      isString(p.hedge) &&
      isFiniteNumber(p.macro) &&
      isFiniteNumber(p.cf) &&
      isFiniteNumber(p.value) &&
      isFiniteNumber(p.momentum) &&
      isFiniteNumber(p.riskScore),
  );
  if (!picksValid) return false;

  const matrixValid = value.matrix.every(
    (m) =>
      isRecord(m) &&
      isString(m.name) &&
      LEVELS.has(String(m.ret)) &&
      LEVELS.has(String(m.risk)) &&
      CF_EVAL.has(String(m.cf)) &&
      POSITION_TYPES.has(String(m.pos)) &&
      typeof m.warn === "boolean",
  );
  if (!matrixValid) return false;

  const alloc = value.alloc;
  const allocValid =
    isFiniteNumber(alloc.stocks) &&
    isFiniteNumber(alloc.funds) &&
    isFiniteNumber(alloc.cash);
  if (!allocValid) return false;

  return value.corrMatrix.every(
    (c) =>
      isRecord(c) &&
      isString(c.a) &&
      isString(c.b) &&
      isFiniteNumber(c.coeff),
  );
}

function isValidStepResult(step: PipelineStep, result: StepResult): boolean {
  switch (step) {
    case 0:
      return isMacroResult(result);
    case 1:
      return isStockSelectionResult(result);
    case 2:
      return isDebateResult(result);
    case 3:
      return isFinalEvaluation(result);
    default:
      return false;
  }
}

// ── Helpers ─────────────────────────────────────

function json(body: RunResponse, status = 200): NextResponse {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string, status: number): NextResponse {
  return json({ result: null, error: message }, status);
}

function buildRetryState(retryAfterSeconds: number | null): NavigatorRetryState {
  const seconds =
    retryAfterSeconds != null && Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0
      ? retryAfterSeconds
      : DEFAULT_GEMINI_RATE_LIMIT_COOLDOWN_SECONDS;

  return {
    reason: "rate_limit",
    retryAfterSeconds: seconds,
    retryAt: new Date(Date.now() + seconds * 1000).toISOString(),
  };
}

function buildRateLimitMessage(step: PipelineStep, retryAfterSeconds: number | null): string {
  const seconds =
    retryAfterSeconds != null && Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0
      ? retryAfterSeconds
      : DEFAULT_GEMINI_RATE_LIMIT_COOLDOWN_SECONDS;
  const minutes = Math.max(1, Math.ceil(seconds / 60));

  return `Step ${step} は API混雑のため一時停止しました。約${minutes}分後に再実行してください。`;
}

// ── POST /api/navigator/run ─────────────────────
// Executes a single pipeline step server-side.
// The client (Zustand store) orchestrates the pipeline by calling
// this route once per step, passing previous-step results as context.

const VALID_MARKETS = new Set(["US", "JP", "BOTH"]);
const VALID_RISKS = new Set(["low", "mid", "high"]);
const VALID_HORIZONS = new Set(["short", "mid", "long"]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Parse request body ────────────────────────
  let body: RunRequestBody;
  try {
    body = (await request.json()) as RunRequestBody;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { step, settings, macro, stocks, debate, freeInput } = body;
  const userInstruction = typeof freeInput === "string"
    ? freeInput.trim().slice(0, 1200)
    : "";

  // ── Validate step number ──────────────────────
  if (step == null || ![0, 1, 2, 3].includes(step)) {
    return errorResponse(`Invalid step: ${String(step)}. Must be 0-3.`, 400);
  }

  // ── Validate settings ─────────────────────────
  if (!settings || !settings.market || !settings.risk || !settings.horizon) {
    return errorResponse("Missing or incomplete settings", 400);
  }
  if (
    !VALID_MARKETS.has(settings.market) ||
    !VALID_RISKS.has(settings.risk) ||
    !VALID_HORIZONS.has(settings.horizon)
  ) {
    return errorResponse("Invalid settings values", 400);
  }

  // ── Check API key ─────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    return errorResponse("Gemini APIキーが未設定です。設定後に再実行してください。", 503);
  }

  // ── Validate previous-step dependencies ───────
  if (step >= 1 && !macro) {
    return errorResponse("Step 1+ requires macro result from previous step", 400);
  }
  if (step >= 1 && macro && !isMacroResult(macro)) {
    return errorResponse("Invalid macro result schema from previous step", 400);
  }
  if (step >= 2 && !stocks) {
    return errorResponse("Step 2+ requires stocks result from previous step", 400);
  }
  if (step >= 2 && stocks && !isStockSelectionResult(stocks)) {
    return errorResponse("Invalid stocks result schema from previous step", 400);
  }
  if (step >= 3 && !debate) {
    return errorResponse("Step 3 requires debate result from previous step", 400);
  }
  if (step >= 3 && debate && !isDebateResult(debate)) {
    return errorResponse("Invalid debate result schema from previous step", 400);
  }

  // ── Execute pipeline step ─────────────────────
  try {
    let liveResult: StepResult | null = null;
    switch (step) {
      case 0: {
        // Fetch live market data to inject into macro analysis
        // If Yahoo is blocked/slow, proceed without live context
        let marketContext: string | undefined;
        try {
          const marketData = await fetchMacroMarketData(settings.market);
          // Only pass context if real data was fetched (not the fallback message)
          if (marketData.indices.some((q) => q.price != null)) {
            marketContext = marketData.summary;
          }
        } catch (e) {
          console.warn("[navigator/run] Market data fetch failed, proceeding without:", e);
        }
        liveResult = await runMacroResearch(settings, apiKey, marketContext, userInstruction);
        break;
      }
      case 1: {
        // Fetch top stock fundamentals for reference
        // If Yahoo is blocked/slow, proceed without stock context
        let stockDataContext: string | undefined;
        try {
          const topCodes = settings.market === "US"
            ? ["AAPL", "MSFT", "GOOGL", "AMZN", "JPM", "V"]
            : settings.market === "JP"
              ? ["7203", "8306", "6758", "7974", "9984", "6861"]
              : ["AAPL", "MSFT", "7203", "8306", "6758", "9984"];
          const fundamentals = await fetchStockFundamentals(topCodes, settings.market);
          const lines = fundamentals
            .filter((f) => f.price != null)
            .map((f) => {
              const chg = f.changePercent != null ? ` (${f.changePercent >= 0 ? "+" : ""}${f.changePercent.toFixed(1)}%)` : "";
              return `${f.code} ${f.name}: ¥${f.price?.toLocaleString()}${chg}`;
            })
            .join("\n");
          if (lines) {
            stockDataContext = lines;
          }
        } catch (e) {
          console.warn("[navigator/run] Stock fundamentals fetch failed, proceeding without:", e);
        }
        liveResult = await runStockSelection(settings, macro!, apiKey, stockDataContext, userInstruction);
        break;
      }
      case 2:
        liveResult = await runDebate(settings, stocks!, macro!, apiKey, userInstruction);
        break;
      case 3:
        liveResult = await runFinalEvaluation(settings, stocks!, debate!, macro!, apiKey, userInstruction);
        break;
    }

    if (!liveResult) {
      return errorResponse(`Step ${step} の結果が空です。時間をおいて再実行してください。`, 502);
    }

    if (!isValidStepResult(step, liveResult)) {
      return errorResponse(`Step ${step} の応答スキーマが不正です。時間をおいて再実行してください。`, 502);
    }

    return json({ result: liveResult, error: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[navigator/run] Step ${step} failed:`, err);
    if (isGeminiRateLimitError(err)) {
      const retry = buildRetryState(err.retryAfterSeconds);
      const response = json(
        {
          result: null,
          error: buildRateLimitMessage(step, err.retryAfterSeconds),
          retry,
        },
        429,
      );
      response.headers.set("Retry-After", String(retry.retryAfterSeconds));
      return response;
    }
    const timeoutLike = /timed out|timeout/i.test(message);
    const status = timeoutLike ? 504 : 502;
    console.error(`[navigator/run] Step ${step} detail: ${message}`);
    return errorResponse(
      `Step ${step} の処理に失敗しました。時間をおいて再実行してください。`,
      status,
    );
  }
}

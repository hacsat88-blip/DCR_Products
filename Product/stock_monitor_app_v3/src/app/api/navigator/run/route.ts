import { NextRequest, NextResponse } from "next/server";

import type {
  NavigatorSettings,
  MacroResult,
  StockSelectionResult,
  DebateResult,
  FinalEvaluation,
  PipelineStep,
} from "@/types/navigator";
import {
  runMacroResearch,
  runStockSelection,
  runDebate,
  runFinalEvaluation,
} from "@/services/gemini";

// ── Types ───────────────────────────────────────

interface RunRequestBody {
  step: PipelineStep;
  settings: NavigatorSettings;
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

// ── POST /api/navigator/run ─────────────────────
// Executes a single pipeline step server-side.
// The client (Zustand store) orchestrates the pipeline by calling
// this route once per step, passing previous-step results as context.

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Parse request body ────────────────────────
  let body: RunRequestBody;
  try {
    body = (await request.json()) as RunRequestBody;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { step, settings, macro, stocks, debate } = body;

  // ── Validate step number ──────────────────────
  if (step == null || ![0, 1, 2, 3].includes(step)) {
    return errorResponse(`Invalid step: ${String(step)}. Must be 0-3.`, 400);
  }

  // ── Validate settings ─────────────────────────
  if (!settings || !settings.market || !settings.risk || !settings.horizon) {
    return errorResponse("Missing or incomplete settings", 400);
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
  if (step >= 2 && !stocks) {
    return errorResponse("Step 2+ requires stocks result from previous step", 400);
  }
  if (step >= 3 && !debate) {
    return errorResponse("Step 3 requires debate result from previous step", 400);
  }

  // ── Execute pipeline step ─────────────────────
  try {
    let liveResult: StepResult | null = null;
    switch (step) {
      case 0:
        liveResult = await runMacroResearch(settings, apiKey);
        break;
      case 1:
        liveResult = await runStockSelection(settings, macro!, apiKey);
        break;
      case 2:
        liveResult = await runDebate(settings, stocks!, macro!, apiKey);
        break;
      case 3:
        liveResult = await runFinalEvaluation(settings, stocks!, debate!, macro!, apiKey);
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
    const timeoutLike = /timed out|timeout/i.test(message);
    const status = timeoutLike ? 504 : 502;
    return errorResponse(
      `Step ${step} の処理に失敗しました。時間をおいて再実行してください。 (detail: ${message})`,
      status,
    );
  }
}

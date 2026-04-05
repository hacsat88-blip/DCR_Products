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

// ── Helpers ─────────────────────────────────────

function json(body: RunResponse, status = 200): NextResponse {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string): NextResponse {
  return json({ result: null, error: message });
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
    return errorResponse("Invalid JSON body");
  }

  const { step, settings, macro, stocks, debate } = body;

  // ── Validate step number ──────────────────────
  if (step == null || ![0, 1, 2, 3].includes(step)) {
    return errorResponse(`Invalid step: ${String(step)}. Must be 0-3.`);
  }

  // ── Validate settings ─────────────────────────
  if (!settings || !settings.market || !settings.risk || !settings.horizon) {
    return errorResponse("Missing or incomplete settings");
  }

  // ── Check API key ─────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    return json({ result: null, error: "GEMINI_API_KEY not configured", mock: true });
  }

  // ── Validate previous-step dependencies ───────
  if (step >= 1 && !macro) {
    return errorResponse("Step 1+ requires macro result from previous step");
  }
  if (step >= 2 && !stocks) {
    return errorResponse("Step 2+ requires stocks result from previous step");
  }
  if (step >= 3 && !debate) {
    return errorResponse("Step 3 requires debate result from previous step");
  }

  // ── Execute pipeline step ─────────────────────
  try {
    let result: StepResult | null = null;

    switch (step) {
      case 0:
        result = await runMacroResearch(settings, apiKey);
        break;
      case 1:
        result = await runStockSelection(settings, macro!, apiKey);
        break;
      case 2:
        result = await runDebate(settings, stocks!, macro!, apiKey);
        break;
      case 3:
        result = await runFinalEvaluation(settings, stocks!, debate!, macro!, apiKey);
        break;
    }

    if (!result) {
      return errorResponse(`Step ${step} returned no result`);
    }

    return json({ result, error: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(`Step ${step} failed: ${message}`);
  }
}

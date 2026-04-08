import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";

import type {
  NavigatorSettings,
  MacroResult,
  StockSelectionResult,
  DebateResult,
} from "@/types/navigator";

const geminiMocks = vi.hoisted(() => ({
  runMacroResearch: vi.fn(),
  runStockSelection: vi.fn(),
  runDebate: vi.fn(),
  runFinalEvaluation: vi.fn(),
}));

vi.mock("@/services/gemini", () => ({
  runMacroResearch: geminiMocks.runMacroResearch,
  runStockSelection: geminiMocks.runStockSelection,
  runDebate: geminiMocks.runDebate,
  runFinalEvaluation: geminiMocks.runFinalEvaluation,
}));

import { POST } from "./route";

const ORIGINAL_GEMINI_KEY = process.env.GEMINI_API_KEY;

const SETTINGS: NavigatorSettings = {
  market: "JP",
  risk: "mid",
  horizon: "mid",
};

const MACRO: MacroResult = {
  environment: "neutral",
  label: "🟡中立",
  sectors: [{ name: "半導体", reason: "需要継続" }],
  risks: [{ name: "円安", stars: 3, trend: "→" }],
  chain: null,
};

const STOCKS: StockSelectionResult = {
  stocks: [
    {
      code: "8306",
      name: "三菱UFJ FG",
      price: "¥1000",
      fcfYield: "5.0%",
      cfMargin: "N/A",
      cfTrend: "↑",
      sector: "銀行",
      type: "stock",
      reason: "テスト用データ",
    },
  ],
};

const DEBATE: DebateResult = {
  verdicts: [
    {
      code: "8306",
      signal: "go",
      priority: "高",
      confidence: 86,
      pro: "利上げ恩恵",
      con: "景気減速",
      cfNote: "CFは良好",
    },
  ],
};

function buildRequest(step: 0 | 1 | 2 | 3): NextRequest {
  return new NextRequest("http://localhost:3000/api/navigator/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      step,
      settings: SETTINGS,
      macro: MACRO,
      stocks: STOCKS,
      debate: DEBATE,
    }),
  });
}

function buildStep1WithoutMacroRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/navigator/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      step: 1,
      settings: SETTINGS,
    }),
  });
}

describe("POST /api/navigator/run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    if (ORIGINAL_GEMINI_KEY == null) {
      delete process.env.GEMINI_API_KEY;
      return;
    }
    process.env.GEMINI_API_KEY = ORIGINAL_GEMINI_KEY;
  });

  it("returns 503 when Gemini API key is missing", async () => {
    delete process.env.GEMINI_API_KEY;

    const response = await POST(buildRequest(0));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.result).toBeNull();
    expect(payload.error).toContain("Gemini APIキーが未設定");
    expect(geminiMocks.runMacroResearch).not.toHaveBeenCalled();
  });

  it("returns live result when step 0 succeeds", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    geminiMocks.runMacroResearch.mockResolvedValueOnce(MACRO);

    const response = await POST(buildRequest(0));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.error).toBeNull();
    expect(payload.result).toEqual(MACRO);
    expect(payload.mock).toBeUndefined();
  });

  it("returns 400 when step dependency is missing", async () => {
    process.env.GEMINI_API_KEY = "test-key";

    const response = await POST(buildStep1WithoutMacroRequest());
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.result).toBeNull();
    expect(payload.error).toContain("requires macro result");
    expect(geminiMocks.runStockSelection).not.toHaveBeenCalled();
  });

  it("returns 502 when live execution fails and does not fallback to mock", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    geminiMocks.runMacroResearch.mockRejectedValueOnce(new Error("Gemini failed"));

    const response = await POST(buildRequest(0));
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.result).toBeNull();
    expect(payload.error).toContain("再実行してください");
    expect(payload.mock).toBeUndefined();
  });

  it("returns 502 when live response schema is invalid", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    geminiMocks.runMacroResearch.mockResolvedValueOnce({ invalid: true });

    const response = await POST(buildRequest(0));
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.result).toBeNull();
    expect(payload.error).toContain("応答スキーマが不正");
  });
});

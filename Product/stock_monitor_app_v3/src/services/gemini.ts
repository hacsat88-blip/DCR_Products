// ────────────────────────────────────────────────
// Gemini API Service — AI Investment Navigator Pipeline
// ────────────────────────────────────────────────
//
// Wraps Google Gemini API calls for a 4-stage investment research pipeline.
// The API key is always passed as a parameter — this module never reads env vars.

import type {
  NavigatorSettings,
  MacroResult,
  StockSelectionResult,
  DebateResult,
  FinalEvaluation,
  MarketScope,
  RiskTolerance,
  InvestmentHorizon,
} from "@/types/navigator";

// ────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const REQUEST_TIMEOUT_MS = 30_000;

// ────────────────────────────────────────────────
// Label Mappings
// ────────────────────────────────────────────────

const MARKET_LABELS: Record<MarketScope, string> = {
  US: "米国",
  JP: "日本",
  BOTH: "米国＆日本",
};

const RISK_LABELS: Record<RiskTolerance, string> = {
  low: "低",
  mid: "中",
  high: "高",
};

const HORIZON_LABELS: Record<InvestmentHorizon, string> = {
  short: "短期",
  mid: "中期",
  long: "長期",
};

// ────────────────────────────────────────────────
// Core API Caller
// ────────────────────────────────────────────────

/**
 * Low-level Gemini API call. Sends a system + user prompt pair,
 * extracts the text response, strips markdown fences, and parses JSON.
 *
 * @returns Parsed JSON object, or `null` on any failure.
 */
async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<unknown> {
  const url = `${GEMINI_ENDPOINT}?key=${apiKey}`;

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 4096,
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `Gemini API returned HTTP ${response.status}: ${errorBody.slice(0, 200)}`,
      );
    }

    const json = await response.json();

    // Extract text from Gemini response structure
    const text: string | undefined =
      json?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof text !== "string" || text.trim().length === 0) {
      throw new Error("Gemini returned empty or malformed content.");
    }

    // Strip markdown code fences (```json ... ``` or ``` ... ```)
    const stripped = text
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    return JSON.parse(stripped);
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Gemini API request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function labels(s: NavigatorSettings) {
  return {
    marketLabel: MARKET_LABELS[s.market],
    riskLabel: RISK_LABELS[s.risk],
    horizonLabel: HORIZON_LABELS[s.horizon],
  };
}

function stockSpec(market: MarketScope): string {
  switch (market) {
    case "JP":
      return "TSE Prime ¥100-¥1000 stocks(3-5)+2-3 JP investment trusts";
    case "US":
      return "3-4 Dow Jones stocks+2-3 US ETFs";
    case "BOTH":
      return "3 Dow stocks+2 US ETFs+3 TSE Prime ¥100-¥1000+2 JP funds, max 10 total";
  }
}

// ────────────────────────────────────────────────
// STATE 1 — Macro Research
// ────────────────────────────────────────────────

const MACRO_SYSTEM_PROMPT = [
  "Return ONLY valid compact JSON. No explanation.",
  'Schema: {"environment":"bullish|neutral|bearish",',
  '"label":"🟢強気|🟡中立|🔴弱気",',
  '"sectors":[{"name":"str","reason":"10chars"}],',
  '"risks":[{"name":"str","stars":3,"trend":"↑|→|↓"}],',
  '"chain":null}.',
  "Max 3 sectors, max 3 risks. stars is 1-5.",
  'chain: non-null ONLY when market=BOTH, else must be null.',
].join(" ");

/**
 * STATE 1: Analyzes the current global macro environment and returns
 * market outlook, promising sectors, and key risk factors.
 */
export async function runMacroResearch(
  settings: NavigatorSettings,
  apiKey: string,
): Promise<MacroResult | null> {
  const { marketLabel, riskLabel, horizonLabel } = labels(settings);

  const userPrompt = [
    `Market:${settings.market}`,
    `Date:${today()}`,
    `Risk:${riskLabel}`,
    `Horizon:${horizonLabel}.`,
    `Analyze current global macro for ${marketLabel} equity investment.`,
  ].join(" ");

  try {
    const result = await callGemini(MACRO_SYSTEM_PROMPT, userPrompt, apiKey);
    return result as MacroResult;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────
// STATE 2 — Stock Selection
// ────────────────────────────────────────────────

const SELECTION_SYSTEM_PROMPT = [
  "Return ONLY valid compact JSON. No explanation.",
  'Schema: {"stocks":[{"code":"str","name":"str",',
  '"price":"¥x or $x","fcfYield":"x% or N/A",',
  '"cfMargin":"x% or N/A","cfTrend":"↑|→|↓",',
  '"sector":"str","type":"stock|etf|fund",',
  '"reason":"20chars"}]}.',
  "cfTrend values: ↑ ↗ → ↘ ↓.",
].join(" ");

/**
 * STATE 2: Selects stocks, ETFs, and/or investment trusts based on
 * the macro environment and cash-flow analysis.
 */
export async function runStockSelection(
  settings: NavigatorSettings,
  macro: MacroResult,
  apiKey: string,
): Promise<StockSelectionResult | null> {
  const { riskLabel, horizonLabel } = labels(settings);
  const spec = stockSpec(settings.market);

  const userPrompt = [
    `Select ${spec}.`,
    `Macro:${JSON.stringify(macro)}.`,
    `Risk:${riskLabel}`,
    `Horizon:${horizonLabel}.`,
    "Focus on sector diversification and CF quality.",
  ].join(" ");

  try {
    const result = await callGemini(SELECTION_SYSTEM_PROMPT, userPrompt, apiKey);
    return result as StockSelectionResult;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────
// STATE 3 — Debate
// ────────────────────────────────────────────────

const DEBATE_SYSTEM_PROMPT = [
  "Return ONLY valid compact JSON. No explanation.",
  'Schema: {"verdicts":[{"code":"str",',
  '"signal":"go|watch|out",',
  '"priority":"高|中|低",',
  '"pro":"15chars","con":"15chars",',
  '"cfNote":"str"}]}.',
  "go=consensus buy, watch=split opinion, out=fatal risk found.",
].join(" ");

/**
 * STATE 3: Conducts a multi-perspective debate on each selected stock,
 * producing go / watch / out signals with pros, cons, and CF notes.
 */
export async function runDebate(
  settings: NavigatorSettings,
  stocks: StockSelectionResult,
  macro: MacroResult,
  apiKey: string,
): Promise<DebateResult | null> {
  const { riskLabel, horizonLabel } = labels(settings);

  const stockSummary = stocks.stocks.map((s) => ({
    code: s.code,
    name: s.name,
    fcfYield: s.fcfYield,
    cfMargin: s.cfMargin,
    sector: s.sector,
  }));

  const userPrompt = [
    `Evaluate:${JSON.stringify(stockSummary)}.`,
    `Macro:${macro.label}.`,
    `Risk:${riskLabel}`,
    `Horizon:${horizonLabel}.`,
  ].join(" ");

  try {
    const result = await callGemini(DEBATE_SYSTEM_PROMPT, userPrompt, apiKey);
    return result as DebateResult;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────
// STATE 4 — Final Evaluation
// ────────────────────────────────────────────────

const FINAL_SYSTEM_PROMPT = [
  "Return ONLY valid compact JSON. No explanation.",
  "Schema: {",
  '"bestStocks":[{"rank":1,"code":"str","name":"str","stars":5,',
  '"macro":4,"cf":5,"value":3,"momentum":4,"riskScore":2,',
  '"fcfYield":"x%","cfMargin":"x%","cfTrend":"↑|→|↓",',
  '"risk1":"str","risk2":"str","hedge":"str"}],',
  '"bestFunds":[same schema],',
  '"matrix":[{"name":"str","ret":"高|中|低","risk":"高|中|低",',
  '"cf":"🟢|🟡|🔴","pos":"コア|サテライト|ヘッジ","warn":false}],',
  '"alloc":{"stocks":60,"funds":30,"cash":10},',
  '"corrMatrix":[{"a":"str","b":"str","coeff":0.5}]}.',
  "bestStocks: top 3 individual stocks with go or watch signal.",
  "bestFunds: top 3 etf/fund with go or watch signal.",
  "corrMatrix: all unique pairs of selected instruments.",
  "alloc should sum to 100.",
].join(" ");

/**
 * STATE 4: Produces the final evaluation — top picks with dimension scores,
 * a risk matrix, target allocation, and correlation matrix.
 */
export async function runFinalEvaluation(
  settings: NavigatorSettings,
  stocks: StockSelectionResult,
  debate: DebateResult,
  macro: MacroResult,
  apiKey: string,
): Promise<FinalEvaluation | null> {
  const { riskLabel, horizonLabel } = labels(settings);

  const userPrompt = [
    `Stocks:${JSON.stringify(stocks)}.`,
    `Verdicts:${JSON.stringify(debate.verdicts)}.`,
    `Macro:${macro.label}.`,
    `Risk:${riskLabel}`,
    `Horizon:${horizonLabel}.`,
  ].join(" ");

  try {
    const result = await callGemini(FINAL_SYSTEM_PROMPT, userPrompt, apiKey);
    return result as FinalEvaluation;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────
// Mock Pipeline (no API key required)
// ────────────────────────────────────────────────

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Returns realistic hardcoded Japanese market data for all 4 pipeline stages.
 * Used when no Gemini API key is available. Includes a 500ms delay per stage
 * to simulate real pipeline execution.
 */
export async function runMockPipeline(settings: NavigatorSettings): Promise<{
  macro: MacroResult;
  stocks: StockSelectionResult;
  debate: DebateResult;
  final: FinalEvaluation;
}> {
  void settings; // acknowledged but unused — mock returns fixed data

  // ── STATE 1 mock ──
  await delay(500);
  const macro: MacroResult = {
    environment: "neutral",
    label: "🟡中立",
    sectors: [
      { name: "半導体", reason: "AI需要が継続的に拡大中" },
      { name: "銀行", reason: "利上げ環境で利鞘改善" },
      { name: "医薬品", reason: "ディフェンシブ需要堅調" },
    ],
    risks: [
      { name: "米中関税リスク", stars: 4, trend: "↑" },
      { name: "円安進行", stars: 3, trend: "→" },
      { name: "長期金利上昇", stars: 3, trend: "↑" },
    ],
    chain: null,
  };

  // ── STATE 2 mock ──
  await delay(500);
  const stocks: StockSelectionResult = {
    stocks: [
      {
        code: "8306",
        name: "三菱UFJ FG",
        price: "¥988",
        fcfYield: "6.2%",
        cfMargin: "N/A",
        cfTrend: "↑",
        sector: "銀行",
        type: "stock",
        reason: "国内最大手メガバンク。利上げ局面で利鞘拡大が見込まれる。",
      },
      {
        code: "6723",
        name: "ルネサスエレクトロニクス",
        price: "¥870",
        fcfYield: "4.8%",
        cfMargin: "22%",
        cfTrend: "↗",
        sector: "半導体",
        type: "stock",
        reason: "車載半導体で世界トップクラス。FCF安定成長中。",
      },
      {
        code: "4568",
        name: "第一三共",
        price: "¥550",
        fcfYield: "2.1%",
        cfMargin: "18%",
        cfTrend: "→",
        sector: "医薬品",
        type: "stock",
        reason: "エンハーツが海外売上伸長中。ディフェンシブ枠。",
      },
      {
        code: "03311187",
        name: "eMAXIS Slim 全世界株式",
        price: "¥23,450",
        fcfYield: "N/A",
        cfMargin: "N/A",
        cfTrend: "→",
        sector: "グローバル分散",
        type: "fund",
        reason: "低コストインデックスファンド。コア資産に最適。",
      },
      {
        code: "29311218",
        name: "SBI・V・S&P500",
        price: "¥22,180",
        fcfYield: "N/A",
        cfMargin: "N/A",
        cfTrend: "→",
        sector: "米国大型",
        type: "fund",
        reason: "S&P500連動の低コストファンド。サテライト枠向け。",
      },
    ],
  };

  // ── STATE 3 mock ──
  await delay(500);
  const debate: DebateResult = {
    verdicts: [
      {
        code: "8306",
        signal: "go",
        priority: "高",
        pro: "利上げ恩恵で業績改善確実",
        con: "海外景気後退なら融資悪化",
        cfNote: "FCF yield 6.2%は銀行セクター内で上位水準。",
      },
      {
        code: "6723",
        signal: "go",
        priority: "高",
        pro: "車載半導体の需要は構造的",
        con: "在庫調整局面入りリスク",
        cfNote: "CF margin 22%、キャッシュ創出力は堅実。",
      },
      {
        code: "4568",
        signal: "watch",
        priority: "中",
        pro: "エンハーツのグローバル展開",
        con: "研究開発費の増加で利益圧迫",
        cfNote: "FCF yield 2.1%はやや低め。パイプライン次第。",
      },
      {
        code: "03311187",
        signal: "go",
        priority: "中",
        pro: "低コストで究極の分散投資",
        con: "為替リスクをフルに受ける",
        cfNote: "ファンドのためCF評価対象外。",
      },
      {
        code: "29311218",
        signal: "go",
        priority: "中",
        pro: "米国大型株の長期成長力",
        con: "S&P500集中リスクあり",
        cfNote: "ファンドのためCF評価対象外。",
      },
    ],
  };

  // ── STATE 4 mock ──
  await delay(500);
  const final: FinalEvaluation = {
    bestStocks: [
      {
        rank: 1,
        code: "8306",
        name: "三菱UFJ FG",
        stars: 4,
        macro: 5,
        cf: 4,
        value: 4,
        momentum: 4,
        riskScore: 3,
        fcfYield: "6.2%",
        cfMargin: "N/A",
        cfTrend: "↑",
        risk1: "海外景気後退",
        risk2: "規制強化",
        hedge: "銀行ETF空売りで個別リスクを軽減",
      },
      {
        rank: 2,
        code: "6723",
        name: "ルネサスエレクトロニクス",
        stars: 4,
        macro: 4,
        cf: 4,
        value: 3,
        momentum: 4,
        riskScore: 3,
        fcfYield: "4.8%",
        cfMargin: "22%",
        cfTrend: "↗",
        risk1: "半導体在庫調整",
        risk2: "為替変動",
        hedge: "半導体ETF空売りでセクターリスクを低減",
      },
      {
        rank: 3,
        code: "4568",
        name: "第一三共",
        stars: 3,
        macro: 3,
        cf: 3,
        value: 3,
        momentum: 3,
        riskScore: 2,
        fcfYield: "2.1%",
        cfMargin: "18%",
        cfTrend: "→",
        risk1: "臨床試験失敗",
        risk2: "薬価改定",
        hedge: "ヘルスケアETFで分散ヘッジ",
      },
    ],
    bestFunds: [
      {
        rank: 1,
        code: "03311187",
        name: "eMAXIS Slim 全世界株式",
        stars: 4,
        macro: 4,
        cf: 3,
        value: 4,
        momentum: 4,
        riskScore: 2,
        fcfYield: "N/A",
        cfMargin: "N/A",
        cfTrend: "→",
        risk1: "世界同時不況",
        risk2: "為替リスク",
        hedge: "円ヘッジ付き債券ファンドを併用",
      },
      {
        rank: 2,
        code: "29311218",
        name: "SBI・V・S&P500",
        stars: 4,
        macro: 4,
        cf: 3,
        value: 3,
        momentum: 4,
        riskScore: 3,
        fcfYield: "N/A",
        cfMargin: "N/A",
        cfTrend: "→",
        risk1: "米国集中リスク",
        risk2: "円高進行",
        hedge: "日本株ファンドとの併用で地域分散",
      },
      {
        rank: 3,
        code: "03311187",
        name: "eMAXIS Slim 全世界株式",
        stars: 4,
        macro: 4,
        cf: 3,
        value: 4,
        momentum: 4,
        riskScore: 2,
        fcfYield: "N/A",
        cfMargin: "N/A",
        cfTrend: "→",
        risk1: "世界同時不況",
        risk2: "為替リスク",
        hedge: "コア配分を維持しつつリバランス",
      },
    ],
    matrix: [
      { name: "三菱UFJ FG", ret: "高", risk: "中", cf: "🟢", pos: "コア", warn: false },
      { name: "ルネサス", ret: "高", risk: "高", cf: "🟢", pos: "サテライト", warn: false },
      { name: "第一三共", ret: "中", risk: "中", cf: "🟡", pos: "サテライト", warn: false },
      { name: "全世界株式", ret: "中", risk: "低", cf: "🟡", pos: "コア", warn: false },
      { name: "S&P500", ret: "高", risk: "中", cf: "🟡", pos: "サテライト", warn: true },
    ],
    alloc: {
      stocks: 50,
      funds: 40,
      cash: 10,
    },
    corrMatrix: [
      { a: "8306", b: "6723", coeff: 0.35 },
      { a: "8306", b: "4568", coeff: 0.2 },
      { a: "6723", b: "4568", coeff: 0.15 },
      { a: "8306", b: "03311187", coeff: 0.55 },
      { a: "8306", b: "29311218", coeff: 0.45 },
      { a: "6723", b: "03311187", coeff: 0.5 },
      { a: "6723", b: "29311218", coeff: 0.6 },
      { a: "4568", b: "03311187", coeff: 0.4 },
      { a: "4568", b: "29311218", coeff: 0.3 },
      { a: "03311187", b: "29311218", coeff: 0.85 },
    ],
  };

  return { macro, stocks, debate, final };
}

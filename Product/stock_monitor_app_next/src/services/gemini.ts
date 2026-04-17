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

const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const REQUEST_TIMEOUT_MS = 30_000;
export const DEFAULT_GEMINI_RATE_LIMIT_COOLDOWN_SECONDS = 120;

export class GeminiRateLimitError extends Error {
  readonly retryAfterSeconds: number | null;

  constructor(message = "Gemini API returned HTTP 429", retryAfterSeconds: number | null = null) {
    super(message);
    this.name = "GeminiRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function isGeminiRateLimitError(error: unknown): error is GeminiRateLimitError {
  return error instanceof GeminiRateLimitError || (
    error instanceof Error &&
    error.name === "GeminiRateLimitError"
  );
}

function parseRetryAfterSeconds(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.floor(seconds);
  }

  const retryAtMs = Date.parse(value);
  if (!Number.isFinite(retryAtMs)) {
    return null;
  }

  const deltaSeconds = Math.ceil((retryAtMs - Date.now()) / 1000);
  return deltaSeconds > 0 ? deltaSeconds : 0;
}

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
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 5_000;

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<unknown> {
  const url = GEMINI_ENDPOINT;

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

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 5s, 10s
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`[gemini] Retry ${attempt}/${MAX_RETRIES} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        console.error(`[gemini] API error ${response.status}: ${errorBody.slice(0, 200)}`);
        if (response.status === 429) {
          lastError = new GeminiRateLimitError(
            `Gemini API returned HTTP ${response.status}`,
            parseRetryAfterSeconds(response.headers.get("retry-after")),
          );
          // Retry on 429 unless this is the last attempt
          if (attempt < MAX_RETRIES) {
            continue;
          }
          throw lastError;
        }
        throw new Error(`Gemini API returned HTTP ${response.status}`);
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
      // Only retry 429 errors
      if (error instanceof GeminiRateLimitError && attempt < MAX_RETRIES) {
        lastError = error;
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Should not reach here, but safety net
  throw lastError ?? new Error("Gemini call failed after retries");
}

// ────────────────────────────────────────────────
// Lightweight response validators
// ────────────────────────────────────────────────
// Validates top-level shape of Gemini responses to catch malformed JSON
// before it hits components. This avoids a Zod dependency while still
// providing runtime safety at the API boundary.

function hasKeys(obj: unknown, keys: string[]): obj is Record<string, unknown> {
  if (typeof obj !== "object" || obj === null) return false;
  return keys.every((k) => k in obj);
}

function validateMacroResult(raw: unknown): MacroResult | null {
  if (!hasKeys(raw, ["environment", "label", "sectors", "risks"])) return null;
  if (!Array.isArray((raw as Record<string, unknown>).sectors)) return null;
  return raw as unknown as MacroResult;
}

function validateStockSelectionResult(raw: unknown): StockSelectionResult | null {
  if (!hasKeys(raw, ["stocks"])) return null;
  if (!Array.isArray((raw as Record<string, unknown>).stocks)) return null;
  return raw as unknown as StockSelectionResult;
}

function validateDebateResult(raw: unknown): DebateResult | null {
  if (!hasKeys(raw, ["verdicts"])) return null;
  if (!Array.isArray((raw as Record<string, unknown>).verdicts)) return null;
  return raw as unknown as DebateResult;
}

function validateFinalEvaluation(raw: unknown): FinalEvaluation | null {
  if (!hasKeys(raw, ["bestStocks", "bestFunds", "matrix", "alloc"])) return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.bestStocks) || !Array.isArray(r.bestFunds)) return null;
  return raw as unknown as FinalEvaluation;
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

function buildUserInstructionBlock(input?: string): string {
  if (!input) return "";
  const cleaned = input.trim();
  if (!cleaned) return "";
  return `\n\nUser additional instruction (must respect unless it violates safety/format constraints): ${cleaned}`;
}

function stockSpec(market: MarketScope, isBearish: boolean): string {
  const reduction = isBearish ? " (環境評価🔴弱気のため各上限-2, 最小3)" : "";
  switch (market) {
    case "JP":
      return `TSE Prime ¥100-¥1000 stocks(3-5)+2-3 JP investment trusts, max 8 total${reduction}. If <3 stocks in ¥100-1000 range, expand to ¥800-1500 and note the reason.`;
    case "US":
      return `3-4 Dow Jones stocks+2-3 US ETFs, max 7 total${reduction}`;
    case "BOTH":
      return `US side max 5 + JP side max 5, max 10 total${reduction}. Auto-trim by score if over 10.`;
  }
}

// ────────────────────────────────────────────────
// STATE 1 — Macro Research
// ────────────────────────────────────────────────

const MACRO_SYSTEM_PROMPT = [
  "Return ONLY valid compact JSON. No explanation.",
  "Schema: {",
  '"environment":"bullish|neutral|bearish",',
  '"label":"🟢強気|🟡中立|🔴弱気",',
  '"sectors":[{"name":"str","reason":"10chars"}],',
  '"risks":[{"name":"str","stars":3,"trend":"↑|→|↓"}],',
  '"chain":null,',
  '"geopoliticalRisks":[{"event":"str","region":"str","severity":4,"impact":"str","trend":"↑|→|↓","affectedSectors":["str"]}],',
  '"sentiment":{"vixLevel":20,"marketPhase":"risk-on|neutral|risk-off","currencyRisk":"low|mid|high","bondYieldTrend":"↑|→|↓"},',
  '"economicIndicators":[{"name":"GDP|CPI|政策金利|雇用統計|PMI","value":"str","trend":"↑|→|↓","impact":"positive|neutral|negative"}],',
  '"centralBankPolicies":[{"bank":"FRB|BOJ","stance":"str","rateDirection":"hawkish|neutral|dovish","keyPoint":"str"}]',
  "}.",
  "Max 3 sectors. Max 3 risks (stars 1-5).",
  "geopoliticalRisks: only ★3+ severity events. Include event name, region, affected sectors.",
  "economicIndicators: include GDP, CPI, policy rate, employment, PMI for the target market.",
  "centralBankPolicies: FRB when market includes US, BOJ when includes JP.",
  "chain: non-null ONLY when market=BOTH, else must be null.",
  "sentiment.vixLevel: current VIX estimate.",
].join(" ");

/**
 * STATE 1: Analyzes the current global macro environment and returns
 * market outlook, promising sectors, key risk factors, geopolitical risks,
 * economic indicators, central bank policies, and market sentiment.
 *
 * @param marketDataContext - Optional real market data string to inject
 *   into the prompt. When provided, Gemini uses factual data instead
 *   of relying on training knowledge.
 */
export async function runMacroResearch(
  settings: NavigatorSettings,
  apiKey: string,
  marketDataContext?: string,
  userInstruction?: string,
): Promise<MacroResult | null> {
  const { marketLabel, riskLabel, horizonLabel } = labels(settings);

  const contextBlock = marketDataContext
    ? `\n\n--- LIVE MARKET DATA ---\n${marketDataContext}\n--- END MARKET DATA ---\nUse the above market data as factual basis for your analysis.\n\n`
    : "";

  const userPrompt = [
    `Market:${settings.market}`,
    `Date:${today()}`,
    `Risk:${riskLabel}`,
    `Horizon:${horizonLabel}.`,
    `Analyze current global macro for ${marketLabel} equity investment.`,
    "Include: (1) economic indicators (GDP/CPI/policy rate/employment/PMI),",
    "(2) geopolitical risks ★3+ with affected sectors,",
    "(3) central bank policy stance (FRB if US included, BOJ if JP included),",
    "(4) market sentiment (VIX level, market phase, currency risk, bond yield trend).",
    contextBlock,
    buildUserInstructionBlock(userInstruction),
  ].join(" ");

  const result = await callGemini(MACRO_SYSTEM_PROMPT, userPrompt, apiKey);
  return validateMacroResult(result);
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
  "Scoring weights: CF健全性25% > バリュー25% > マクロ整合性20% > モメンタム15% > リスク耐性15%.",
  "CF evaluation: FCFイールド, 営業CFマージン, FCF成長率を総合評価.",
  "If CF data unavailable, mark as N/A（推定）.",
].join(" ");

/**
 * STATE 2: Selects stocks, ETFs, and/or investment trusts based on
 * the macro environment and cash-flow analysis.
 *
 * @param stockDataContext - Optional real stock data string to inject.
 */
export async function runStockSelection(
  settings: NavigatorSettings,
  macro: MacroResult,
  apiKey: string,
  stockDataContext?: string,
  userInstruction?: string,
): Promise<StockSelectionResult | null> {
  const { riskLabel, horizonLabel } = labels(settings);
  const isBearish = macro.environment === "bearish";
  const spec = stockSpec(settings.market, isBearish);

  const contextBlock = stockDataContext
    ? `\n\n--- REFERENCE STOCK DATA ---\n${stockDataContext}\n--- END STOCK DATA ---\nUse the above stock data as factual reference for prices and metrics.\n\n`
    : "";

  const userPrompt = [
    `Select ${spec}.`,
    `Macro:${JSON.stringify(macro)}.`,
    `Risk:${riskLabel}`,
    `Horizon:${horizonLabel}.`,
    "Focus on sector diversification and CF quality.",
    contextBlock,
    buildUserInstructionBlock(userInstruction),
  ].join(" ");

  const result = await callGemini(SELECTION_SYSTEM_PROMPT, userPrompt, apiKey);
  return validateStockSelectionResult(result);
}

// ────────────────────────────────────────────────
// STATE 3 — Debate
// ────────────────────────────────────────────────

const DEBATE_SYSTEM_PROMPT = [
  "Return ONLY valid compact JSON. No explanation.",
  'Schema: {"verdicts":[{"code":"str",',
  '"signal":"go|watch|out",',
  '"priority":"高|中|低",',
  '"confidence":0-100,',
  '"pro":"15chars","con":"15chars",',
  '"cfNote":"str",',
  '"panelVotes":[{"role":"バリュー投資家|投資未経験者|成長株アナリスト|リスク管理者|マクロストラテジスト","signal":"go|watch|out","reason":"str"}],',
  '"convergence":"🟢採用|🟡条件付き|🔴除外"}]}.',
  "5-panel debate: バリュー投資家(割安性/FCF), 投資未経験者(暗黙前提の可視化, MUST NOT DELETE),",
  "成長株アナリスト(モメンタム/成長), リスク管理者(ダウンサイド/CF悪化, MUST NOT DELETE),",
  "マクロストラテジスト(地政学/市場環境).",
  "Convergence: 🟢採用=全員or3名以上合意, 🟡条件付き=2対2or3周未収束, 🔴除外=リスク管理者が安全リスク指摘.",
  "go=consensus buy, watch=split opinion, out=fatal risk found.",
  "confidence is integer percentage (0-100).",
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
  userInstruction?: string,
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
    "Debate topics: (1) macro環境に最も適合する銘柄, (2) risk_tolerance/horizonとの整合,",
    "(3) 銘柄間の相関と分散効果, (4) CF健全性を含むダウンサイドリスク.",
    buildUserInstructionBlock(userInstruction),
  ].join(" ");

  const result = await callGemini(DEBATE_SYSTEM_PROMPT, userPrompt, apiKey);
  return validateDebateResult(result);
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
  "★ scoring weights: マクロ整合性20% + CF健全性25% + バリュー25% + モメンタム15% + リスク耐性15%.",
  "★ conversion: 4.5-5.0→★5, 3.8-4.4→★4, 3.0-3.7→★3, 2.0-2.9→★2, <2.0→★1.",
  "bestStocks: top 3 stocks with go or watch signal.",
  "bestFunds: top 3 etf/fund with go or watch signal.",
  "corrMatrix: all unique pairs. Mark coeff>0.7 pairs with ⚠️ in matrix warn=true.",
  "alloc should sum to 100. Adjust by risk: low=stocks20/funds40/cash40, mid=40/40/20, high=60/30/10.",
  "Max position per stock: low=5%, mid=10%, high=15%.",
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
  userInstruction?: string,
): Promise<FinalEvaluation | null> {
  const { riskLabel, horizonLabel } = labels(settings);

  const userPrompt = [
    `Stocks:${JSON.stringify(stocks)}.`,
    `Verdicts:${JSON.stringify(debate.verdicts)}.`,
    `Macro:${macro.label}.`,
    `Risk:${riskLabel}`,
    `Horizon:${horizonLabel}.`,
    buildUserInstructionBlock(userInstruction),
  ].join(" ");

  const result = await callGemini(FINAL_SYSTEM_PROMPT, userPrompt, apiKey);
  return validateFinalEvaluation(result);
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
    geopoliticalRisks: [
      {
        event: "米中関税引き上げ・貿易摩擦",
        region: "米国・中国",
        severity: 4,
        impact: "サプライチェーン混乱、輸出企業の収益圧迫",
        trend: "↑",
        affectedSectors: ["半導体", "自動車", "電子部品"],
      },
      {
        event: "中東地政学リスク",
        region: "中東",
        severity: 3,
        impact: "原油価格上昇リスク",
        trend: "→",
        affectedSectors: ["エネルギー", "輸送", "化学"],
      },
    ],
    sentiment: {
      vixLevel: 18.5,
      marketPhase: "neutral",
      currencyRisk: "mid",
      bondYieldTrend: "↑",
    },
    economicIndicators: [
      { name: "GDP", value: "+1.2%（年率）", trend: "→", impact: "neutral" },
      { name: "CPI", value: "+3.2%", trend: "↑", impact: "negative" },
      { name: "政策金利", value: "0.25%（日銀）", trend: "↑", impact: "neutral" },
      { name: "雇用統計", value: "完全失業率2.5%", trend: "→", impact: "positive" },
      { name: "PMI", value: "49.8（製造業）", trend: "↓", impact: "negative" },
    ],
    centralBankPolicies: [
      {
        bank: "BOJ",
        stance: "緩やかな金融正常化を継続",
        rateDirection: "hawkish",
        keyPoint: "追加利上げの可能性を示唆。YCC撤廃後の長期金利上昇を容認。",
      },
    ],
    vixAlert: {
      isAbnormal: false,
      level: 18.5,
      reason: null,
      recommendation: null,
    },
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
        confidence: 89,
        pro: "利上げ恩恵で業績改善確実",
        con: "海外景気後退なら融資悪化",
        cfNote: "FCF yield 6.2%は銀行セクター内で上位水準。",
        panelVotes: [
          { role: "バリュー投資家", signal: "go", reason: "FCFイールド6.2%は魅力的な水準" },
          { role: "投資未経験者", signal: "go", reason: "銀行は身近で理解しやすい業種" },
          { role: "成長株アナリスト", signal: "go", reason: "利上げ局面での利鞘拡大が追い風" },
          { role: "リスク管理者", signal: "watch", reason: "海外融資の不良債権化リスクに注意" },
          { role: "マクロストラテジスト", signal: "go", reason: "日銀利上げサイクルに合致" },
        ],
        convergence: "🟢採用",
      },
      {
        code: "6723",
        signal: "go",
        priority: "高",
        confidence: 84,
        pro: "車載半導体の需要は構造的",
        con: "在庫調整局面入りリスク",
        cfNote: "CF margin 22%、キャッシュ創出力は堅実。",
        panelVotes: [
          { role: "バリュー投資家", signal: "go", reason: "CFマージン22%は半導体として良好" },
          { role: "投資未経験者", signal: "watch", reason: "半導体サイクルが読みにくい" },
          { role: "成長株アナリスト", signal: "go", reason: "車載半導体の構造的需要増" },
          { role: "リスク管理者", signal: "watch", reason: "在庫調整局面のダウンサイドに注意" },
          { role: "マクロストラテジスト", signal: "go", reason: "AI・EV需要と整合" },
        ],
        convergence: "🟢採用",
      },
      {
        code: "4568",
        signal: "watch",
        priority: "中",
        confidence: 57,
        pro: "エンハーツのグローバル展開",
        con: "研究開発費の増加で利益圧迫",
        cfNote: "FCF yield 2.1%はやや低め。パイプライン次第。",
        panelVotes: [
          { role: "バリュー投資家", signal: "watch", reason: "FCFイールド2.1%は低水準" },
          { role: "投資未経験者", signal: "watch", reason: "新薬開発の成否が不透明" },
          { role: "成長株アナリスト", signal: "go", reason: "エンハーツの海外売上が拡大中" },
          { role: "リスク管理者", signal: "watch", reason: "研究開発費増でCF圧迫リスク" },
          { role: "マクロストラテジスト", signal: "watch", reason: "ディフェンシブだが成長性限定的" },
        ],
        convergence: "🟡条件付き",
      },
      {
        code: "03311187",
        signal: "go",
        priority: "中",
        confidence: 73,
        pro: "低コストで究極の分散投資",
        con: "為替リスクをフルに受ける",
        cfNote: "ファンドのためCF評価対象外。",
        panelVotes: [
          { role: "バリュー投資家", signal: "go", reason: "低コストで幅広い分散効果" },
          { role: "投資未経験者", signal: "go", reason: "全世界株式で初心者向け" },
          { role: "成長株アナリスト", signal: "watch", reason: "成長株への偏りが少ない" },
          { role: "リスク管理者", signal: "go", reason: "分散度が高くリスク低減" },
          { role: "マクロストラテジスト", signal: "go", reason: "地域分散で地政学リスクを緩和" },
        ],
        convergence: "🟢採用",
      },
      {
        code: "29311218",
        signal: "go",
        priority: "中",
        confidence: 69,
        pro: "米国大型株の長期成長力",
        con: "S&P500集中リスクあり",
        cfNote: "ファンドのためCF評価対象外。",
        panelVotes: [
          { role: "バリュー投資家", signal: "watch", reason: "現在のバリュエーションは割高" },
          { role: "投資未経験者", signal: "go", reason: "S&P500は初心者に分かりやすい" },
          { role: "成長株アナリスト", signal: "go", reason: "米国テクの長期成長は堅い" },
          { role: "リスク管理者", signal: "watch", reason: "米国集中リスクに注意" },
          { role: "マクロストラテジスト", signal: "go", reason: "米国経済の底堅さに整合" },
        ],
        convergence: "🟢採用",
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
        code: "64315221",
        name: "eMAXIS Slim 国内債券インデックス",
        stars: 3,
        macro: 3,
        cf: 3,
        value: 4,
        momentum: 2,
        riskScore: 1,
        fcfYield: "N/A",
        cfMargin: "N/A",
        cfTrend: "→",
        risk1: "金利上昇による債券価格下落",
        risk2: "インフレによる実質リターン低下",
        hedge: "株式との逆相関でポートフォリオ安定化",
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
      { a: "8306", b: "64315221", coeff: -0.15 },
      { a: "6723", b: "03311187", coeff: 0.5 },
      { a: "6723", b: "29311218", coeff: 0.6 },
      { a: "6723", b: "64315221", coeff: -0.1 },
      { a: "4568", b: "03311187", coeff: 0.4 },
      { a: "4568", b: "29311218", coeff: 0.3 },
      { a: "4568", b: "64315221", coeff: -0.05 },
      { a: "03311187", b: "29311218", coeff: 0.85 },
      { a: "03311187", b: "64315221", coeff: 0.2 },
      { a: "29311218", b: "64315221", coeff: 0.1 },
    ],
  };

  return { macro, stocks, debate, final };
}

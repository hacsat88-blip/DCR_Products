import {
  chat,
  chatStream,
  type ChatMessage,
  type ChatOptions,
  type OpenRouterWebSearchTool,
} from "./openrouterClient";
import {
  ANALYZER_SYSTEM_PROMPT,
  buildAnalyzerUserPrompt,
  type AnalyzerInput,
} from "./prompts/analyzer";
import {
  SUMMARIZER_SYSTEM_PROMPT,
  buildSummarizerUserPrompt,
  type NewsItemInput,
} from "./prompts/summarizer";
import {
  INTENT_SYSTEM_PROMPT,
  buildIntentUserPrompt,
} from "./prompts/intentExtractor";
import { withBoundary } from "./prompts/boundary";
import {
  IntentSchema,
  MarketAnomalySchema,
  NewsSummarySchema,
  StockAnalysisSchema,
  type Intent,
  type MarketAnomaly,
  type NewsSummary,
  type StockAnalysis,
} from "./schemas";

const REASONING_MODEL_DEFAULT = "openai/gpt-oss-120b:free";
const FAST_MODEL_DEFAULT = "nvidia/nemotron-3-super-120b-a12b:free";

export function reasoningModel(): string {
  return process.env.OPENROUTER_MODEL_REASONING || REASONING_MODEL_DEFAULT;
}
export function fastModel(): string {
  return process.env.OPENROUTER_MODEL_FAST || FAST_MODEL_DEFAULT;
}

/** chat() に共通で渡すオプション (テスト時の fetch 差し替え等を伝搬するため) */
export type RouterCallOptions = Pick<
  ChatOptions<unknown>,
  "fetchImpl" | "sleepImpl" | "maxRetries" | "signal" | "apiKey" | "baseUrl"
>;

// ---------------- analyzeStock ----------------

export async function analyzeStock(
  input: AnalyzerInput,
  opts: RouterCallOptions = {},
): Promise<StockAnalysis> {
  return chat<StockAnalysis>({
    ...opts,
    model: reasoningModel(),
    temperature: 0.2,
    maxTokens: 2048,
    messages: [
      { role: "system", content: ANALYZER_SYSTEM_PROMPT },
      { role: "user", content: buildAnalyzerUserPrompt(input) },
    ],
    responseFormat: { schema: StockAnalysisSchema, name: "stock_analysis" },
  });
}

// ---------------- summarizeNews ----------------

export async function summarizeNews(
  items: NewsItemInput[],
  opts: RouterCallOptions = {},
): Promise<NewsSummary> {
  return chat<NewsSummary>({
    ...opts,
    model: fastModel(),
    temperature: 0.3,
    maxTokens: 1024,
    messages: [
      { role: "system", content: SUMMARIZER_SYSTEM_PROMPT },
      { role: "user", content: buildSummarizerUserPrompt(items) },
    ],
    responseFormat: { schema: NewsSummarySchema, name: "news_summary" },
  });
}

// ---------------- chat (対話応答) ----------------

const CHAT_SYSTEM = withBoundary(
  `# ROLE
あなたは投資リサーチ補助の対話アシスタントである。
ユーザーの質問に対し、Fact / 推定 / 仮説 / Unknown を区別して日本語で答える。
売買推奨や断定表現は禁止。

# OUTPUT STYLE
- 簡潔・箇条書き優先・必要に応じてセクター名/コードを併記
- 数値は取得日時点である旨を明示
- 末尾に必ず「※参考情報。最終判断はご自身で。」を付与する`,
);

const CHAT_WEB_SEARCH_APPENDIX = `

# WEB SEARCH STYLE
- 最新情報が必要なときだけ Web検索結果を根拠として使う
- 検索を使った場合は、回答末尾に「参考ソース:」を置き、媒体名や URL を 2〜5 件だけ簡潔に列挙する
- 検索結果の丸写しはしない`;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatHistoryOptions extends RouterCallOptions {
  /** 将来のストリーミング対応用フック (現状未使用) */
  stream?: boolean;
  onToken?: (token: string) => void;
  webSearch?: boolean;
}

function webSearchEnabled(): boolean {
  const raw = process.env.OPENROUTER_ENABLE_WEB_SEARCH?.trim().toLowerCase();
  return raw === "1" || raw === "true";
}

function parsePositiveInt(
  raw: string | undefined,
  fallback: number,
): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function parseDomainList(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const domains = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return domains.length > 0 ? domains : undefined;
}

function webSearchTools(enabled: boolean | undefined): OpenRouterWebSearchTool[] | undefined {
  if (!enabled || !webSearchEnabled()) return undefined;
  return [
    {
      type: "openrouter:web_search",
      parameters: {
        max_results: parsePositiveInt(
          process.env.OPENROUTER_WEB_SEARCH_MAX_RESULTS,
          5,
        ),
        max_total_results: parsePositiveInt(
          process.env.OPENROUTER_WEB_SEARCH_MAX_TOTAL_RESULTS,
          15,
        ),
        allowed_domains: parseDomainList(
          process.env.OPENROUTER_WEB_SEARCH_ALLOWED_DOMAINS,
        ),
      },
    },
  ];
}

function chatSystemPrompt(webSearch: boolean | undefined): string {
  return webSearch && webSearchEnabled()
    ? `${CHAT_SYSTEM}${CHAT_WEB_SEARCH_APPENDIX}`
    : CHAT_SYSTEM;
}

export async function chatWithHistory(
  history: ChatTurn[],
  opts: ChatHistoryOptions = {},
): Promise<string> {
  const { stream: _stream, onToken: _onToken, webSearch, ...rest } = opts;
  const messages: ChatMessage[] = [
    { role: "system", content: chatSystemPrompt(webSearch) },
    ...history.map<ChatMessage>((t) => ({ role: t.role, content: t.content })),
  ];
  void _stream;
  void _onToken;
  return chat({
    ...rest,
    model: fastModel(),
    temperature: 0.4,
    maxTokens: 1024,
    messages,
    tools: webSearchTools(webSearch),
  });
}

/**
 * チャット応答をストリーミング（token delta の AsyncIterable）で返す。
 * BOUNDARY を含む system prompt を必ず先頭に付与する。
 */
export async function* chatWithHistoryStream(
  history: ChatTurn[],
  opts: ChatHistoryOptions = {},
): AsyncGenerator<string, void, unknown> {
  const { webSearch, ...rest } = opts;
  const messages: ChatMessage[] = [
    { role: "system", content: chatSystemPrompt(webSearch) },
    ...history.map<ChatMessage>((t) => ({ role: t.role, content: t.content })),
  ];
  yield* chatStream({
    ...rest,
    model: fastModel(),
    temperature: 0.4,
    maxTokens: 1024,
    messages,
    tools: webSearchTools(webSearch),
  });
}

// ---------------- extractIntent ----------------

export async function extractIntent(
  text: string,
  opts: RouterCallOptions = {},
): Promise<Intent> {
  return chat<Intent>({
    ...opts,
    model: fastModel(),
    temperature: 0.0,
    maxTokens: 512,
    messages: [
      { role: "system", content: INTENT_SYSTEM_PROMPT },
      { role: "user", content: buildIntentUserPrompt(text) },
    ],
    responseFormat: { schema: IntentSchema, name: "intent" },
  });
}

// ---------------- detectMarketAnomaly ----------------

const ANOMALY_SYSTEM = withBoundary(
  `# ROLE
市場スナップショット（指数、為替、金利、VIX、ニュース要約等）から、地合いを判定する。

# OUTPUT
- signal: "🟢"=通常, "🟡"=注意, "🔴"=荒天
- level:  "normal" | "caution" | "storm"
- reasons: 判定根拠（2〜5件）
- recommendedAction: 短い行動指針（断定・売買推奨は禁止）

必ず JSON スキーマに従い、JSON のみを返す。`,
);

export interface MarketSnapshot {
  asOf?: string;
  indices?: Record<string, number | string>;
  fx?: Record<string, number | string>;
  rates?: Record<string, number | string>;
  vix?: number | string;
  notes?: string;
}

export async function detectMarketAnomaly(
  snapshot: MarketSnapshot,
  opts: RouterCallOptions = {},
): Promise<MarketAnomaly> {
  const userContent = [
    `# 市場スナップショット`,
    snapshot.asOf ? `- asOf: ${snapshot.asOf}` : "",
    snapshot.indices ? `- indices: ${JSON.stringify(snapshot.indices)}` : "",
    snapshot.fx ? `- fx: ${JSON.stringify(snapshot.fx)}` : "",
    snapshot.rates ? `- rates: ${JSON.stringify(snapshot.rates)}` : "",
    snapshot.vix !== undefined ? `- vix: ${snapshot.vix}` : "",
    snapshot.notes ? `- notes: ${snapshot.notes}` : "",
    "",
    "上記から地合いを判定してください。",
  ]
    .filter(Boolean)
    .join("\n");

  return chat<MarketAnomaly>({
    ...opts,
    model: reasoningModel(),
    temperature: 0.1,
    maxTokens: 768,
    messages: [
      { role: "system", content: ANOMALY_SYSTEM },
      { role: "user", content: userContent },
    ],
    responseFormat: { schema: MarketAnomalySchema, name: "market_anomaly" },
  });
}

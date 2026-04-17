// ────────────────────────────────────────────────
// Tier 4 — "Why did the stock move?" explainer
// ────────────────────────────────────────────────
//
// Uses OpenRouter free reasoning models with the `openrouter:web_search`
// server tool to ground the explanation in real-time news. Primary model
// is `openai/gpt-oss-120b:free` (tool use + structured JSON output);
// fallback is `nvidia/nemotron-3-super-120b-a12b:free` for long-context
// multi-article comparison.
//
// Output is a strict JSON shape separating confirmed drivers from
// speculation, so the UI can render confidence badges and source links.

import { callOpenRouter, OpenRouterError } from "./openrouter";

export const WHY_MOVED_PRIMARY_MODEL = "openai/gpt-oss-120b:free";
export const WHY_MOVED_FALLBACK_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

export interface WhyMovedDriver {
  factor: string;
  evidence: string;
  confidence: "high" | "medium" | "low";
}

export interface WhyMovedResult {
  ticker: string;
  move_summary: string;
  likely_drivers: WhyMovedDriver[];
  notable_sources: string[];
  risk_note: string;
  model_used: string;
}

export interface WhyMovedOptions {
  apiKey: string;
  ticker: string;
  /** Change summary the caller already computed (e.g. "+4.2% on 2x volume"). */
  moveContext: string;
  /** Optional pre-fetched article snippets to reduce web_search calls. */
  articles?: Array<{ title: string; url?: string; snippet?: string }>;
  /** Enable server-side web_search tool. Default true. */
  useWebSearch?: boolean;
  /** "low" | "medium" | "high". Default "medium". */
  reasoningEffort?: "low" | "medium" | "high";
  timeoutMs?: number;
  signal?: AbortSignal;
  referer?: string;
}

export class WhyMovedError extends Error {
  readonly status: number;
  readonly retryAfterSeconds: number | null;
  constructor(message: string, status = 500, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = "WhyMovedError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const SYSTEM_PROMPT =
  'You are a precise Japanese equity research assistant. When asked why a ' +
  'stock moved, ground every claim in verifiable sources. Separate ' +
  '"確定材料" (confirmed) from "推測" (speculation) using the confidence ' +
  "field. Prefer primary sources (TDnet / EDINET / 決算短信 / 公式 IR / " +
  "主要経済メディア). Respond in Japanese. Output MUST be valid JSON only, " +
  "matching the exact shape requested. Do not include commentary outside the JSON.";

function buildUserPrompt(opts: WhyMovedOptions): string {
  const articleBlock =
    opts.articles && opts.articles.length > 0
      ? "\n\n参考記事（事前取得）:\n" +
        opts.articles
          .slice(0, 10)
          .map((a, i) => `${i + 1}. ${a.title}${a.url ? ` (${a.url})` : ""}${a.snippet ? `\n   ${a.snippet}` : ""}`)
          .join("\n")
      : "";

  return (
    `銘柄: ${opts.ticker}\n` +
    `値動き: ${opts.moveContext}\n\n` +
    `この値動きの要因を調査し、以下の JSON 形式で回答してください。\n` +
    `必要に応じて web_search ツールで最新のニュース・開示・決算情報を検索してください。\n\n` +
    `{\n` +
    `  "ticker": "${opts.ticker}",\n` +
    `  "move_summary": "今日の値動きの簡潔な要約",\n` +
    `  "likely_drivers": [\n` +
    `    { "factor": "決算 / 上方修正 / 材料報道 / 地合い / テーマ物色 など", ` +
    `"evidence": "確認できた根拠", "confidence": "high | medium | low" }\n` +
    `  ],\n` +
    `  "notable_sources": ["URL または媒体名"],\n` +
    `  "risk_note": "出来高薄・思惑先行・材料未確認などの注意点"\n` +
    `}` +
    articleBlock
  );
}

function parseResult(raw: string, ticker: string, modelUsed: string): WhyMovedResult {
  const trimmed = raw.trim();
  // Some models wrap JSON in ```json fences
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new WhyMovedError("Model returned no JSON block", 502);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    throw new WhyMovedError(`JSON parse failed: ${(err as Error).message}`, 502);
  }
  const obj = parsed as Record<string, unknown>;
  const drivers = Array.isArray(obj.likely_drivers) ? (obj.likely_drivers as unknown[]) : [];
  return {
    ticker: typeof obj.ticker === "string" && obj.ticker ? obj.ticker : ticker,
    move_summary: typeof obj.move_summary === "string" ? obj.move_summary : "",
    likely_drivers: drivers
      .filter((d): d is Record<string, unknown> => !!d && typeof d === "object")
      .map((d) => ({
        factor: typeof d.factor === "string" ? d.factor : "",
        evidence: typeof d.evidence === "string" ? d.evidence : "",
        confidence:
          d.confidence === "high" || d.confidence === "medium" || d.confidence === "low"
            ? d.confidence
            : "low",
      })),
    notable_sources: Array.isArray(obj.notable_sources)
      ? (obj.notable_sources as unknown[]).filter((s): s is string => typeof s === "string")
      : [],
    risk_note: typeof obj.risk_note === "string" ? obj.risk_note : "",
    model_used: modelUsed,
  };
}

export async function explainWhyMoved(options: WhyMovedOptions): Promise<WhyMovedResult> {
  if (!options.apiKey) {
    throw new WhyMovedError("Missing OpenRouter API key", 401);
  }

  const tools = options.useWebSearch === false ? undefined : [{ type: "openrouter:web_search" }];
  const reasoning = { effort: options.reasoningEffort ?? "medium" };
  const responseFormat = { type: "json_object" };
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: buildUserPrompt(options) },
  ];

  const baseCall = (model: string) =>
    callOpenRouter(messages, {
      apiKey: options.apiKey,
      model,
      temperature: 0.3,
      maxTokens: 2_048,
      timeoutMs: options.timeoutMs ?? 90_000,
      signal: options.signal,
      referer: options.referer,
      appTitle: "Investment Navigator Pro — WhyMoved",
      tools,
      responseFormat,
      reasoning,
      // Stay well under caps since this is on-demand user-facing
      perMinute: 10,
      perDay: 200,
    });

  try {
    const raw = await baseCall(WHY_MOVED_PRIMARY_MODEL);
    return parseResult(raw, options.ticker, WHY_MOVED_PRIMARY_MODEL);
  } catch (err) {
    if (err instanceof OpenRouterError && err.status === 429) {
      throw new WhyMovedError(err.message, 429, err.retryAfterSeconds);
    }
    // Fall back for transient provider errors / parse failures
    try {
      const raw = await baseCall(WHY_MOVED_FALLBACK_MODEL);
      return parseResult(raw, options.ticker, WHY_MOVED_FALLBACK_MODEL);
    } catch (err2) {
      if (err2 instanceof OpenRouterError) {
        throw new WhyMovedError(err2.message, err2.status, err2.retryAfterSeconds);
      }
      if (err2 instanceof WhyMovedError) throw err2;
      throw new WhyMovedError((err2 as Error).message ?? "Unknown error", 500);
    }
  }
}

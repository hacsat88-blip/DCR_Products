// ────────────────────────────────────────────────
// Quick LLM Service — non-reasoning, low-latency layer
// ────────────────────────────────────────────────
//
// Historically this wrapped Gemini direct API. As of the
// Investment Navigator Pro integration we route ALL LLM traffic
// (including the "fast/即応" tier) through OpenRouter to avoid
// Google-side request quotas. The public surface
// (`callGeminiQuick`, `GeminiQuickError`) is preserved so existing
// routes and tests keep working unchanged.

import { callOpenRouter, OpenRouterError } from "@/services/openrouter";

/**
 * Default OpenRouter model used for the Quick tier.
 * Can be overridden via env `QUICK_LLM_MODEL` or per-call.
 * Known good picks (price/latency):
 *   - "qwen/qwen3-next-80b-a3b-instruct:free" (free, fast, default)
 *   - "google/gemini-2.5-flash"               (cheap, very fast)
 *   - "google/gemini-flash-1.5"               (fallback)
 */
export const QUICK_DEFAULT_MODEL =
  process.env.QUICK_LLM_MODEL ?? "qwen/qwen3-next-80b-a3b-instruct:free";

const DEFAULT_TIMEOUT_MS = 20_000;

export class GeminiQuickError extends Error {
  readonly status: number;
  readonly retryAfterSeconds: number | null;
  constructor(message: string, status: number, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = "GeminiQuickError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface GeminiQuickOptions {
  /**
   * OpenRouter API key. The parameter name is kept as `apiKey` for
   * backward compatibility with callers that previously supplied a
   * Gemini key. Routes should pass `process.env.OPENROUTER_API_KEY`.
   */
  apiKey: string;
  model?: string;
  temperature?: number;
  /** Legacy name kept for callers. Maps to OpenRouter `max_tokens`. */
  maxOutputTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Unused — OpenRouter shares the global rate limiter key internally. */
  perMinute?: number;
  perDay?: number;
  referer?: string;
  appTitle?: string;
}

/**
 * Call the Quick LLM tier.
 *
 * Internally delegates to OpenRouter. Errors are rewrapped as
 * `GeminiQuickError` so callers that already handle that type do not
 * need to change.
 */
export async function callGeminiQuick(
  prompt: string,
  options: GeminiQuickOptions,
): Promise<string> {
  const {
    apiKey,
    model = QUICK_DEFAULT_MODEL,
    temperature = 0.3,
    maxOutputTokens = 1024,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
    referer,
    appTitle,
  } = options;

  if (!apiKey) {
    throw new GeminiQuickError("Missing OpenRouter API key", 401);
  }

  try {
    return await callOpenRouter(
      [{ role: "user", content: prompt }],
      {
        apiKey,
        model,
        temperature,
        maxTokens: maxOutputTokens,
        timeoutMs,
        signal,
        referer,
        appTitle: appTitle ?? "Investment Navigator Pro — Quick",
        // Quick tier gets a looser cap than the Deep tier.
        perMinute: 60,
        perDay: 1_000,
      },
    );
  } catch (err) {
    if (err instanceof OpenRouterError) {
      throw new GeminiQuickError(err.message, err.status, err.retryAfterSeconds);
    }
    throw err;
  }
}


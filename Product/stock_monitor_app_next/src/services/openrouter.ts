// ────────────────────────────────────────────────
// OpenRouter Service — Deep reasoning LLM layer
// ────────────────────────────────────────────────
//
// Thin wrapper over OpenRouter's chat completions API. Used for the
// "推論 (Deep)" tier — Navigator pipelines, radar scoring, portfolio
// review. The Flash-tier work continues to flow through gemini.ts.

import { consume, reportBackoff, RateLimitExceededError } from "@/lib/rateLimiter";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 60_000;
const RATE_LIMIT_KEY = "openrouter";

export const OPENROUTER_DEFAULT_MODEL =
  process.env.DEEP_LLM_MODEL ?? "openai/gpt-oss-120b:free";
export const OPENROUTER_FALLBACK_MODEL =
  process.env.DEEP_LLM_FALLBACK_MODEL ?? "nvidia/nemotron-3-super-120b-a12b:free";

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterOptions {
  apiKey: string;
  model?: string;
  /** e.g. "https://<your-app>.vercel.app" — recommended by OpenRouter. */
  referer?: string;
  /** Human-readable app title for OpenRouter dashboards. */
  appTitle?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /** Abort signal from the caller (cancel on navigation / user abort). */
  signal?: AbortSignal;
  /** Per-minute cap (default 20). */
  perMinute?: number;
  /** Per-day cap (default 200 — aligns with ~$20/mo envelope). */
  perDay?: number;
  /** Pass-through tools, e.g. [{ type: "openrouter:web_search" }]. */
  tools?: Array<Record<string, unknown>>;
  /** Pass-through response_format, e.g. { type: "json_object" }. */
  responseFormat?: Record<string, unknown>;
  /** Pass-through reasoning config, e.g. { effort: "medium" }. */
  reasoning?: Record<string, unknown>;
}

export class OpenRouterError extends Error {
  readonly status: number;
  readonly retryAfterSeconds: number | null;
  constructor(message: string, status: number, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = "OpenRouterError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function isOpenRouterRateLimit(err: unknown): err is OpenRouterError {
  return err instanceof OpenRouterError && err.status === 429;
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const n = Number(header);
  if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  const ts = Date.parse(header);
  if (!Number.isFinite(ts)) return null;
  return Math.max(0, Math.ceil((ts - Date.now()) / 1000));
}

export async function callOpenRouter(
  messages: OpenRouterMessage[],
  options: OpenRouterOptions,
): Promise<string> {
  const {
    apiKey,
    model = OPENROUTER_DEFAULT_MODEL,
    referer,
    appTitle = "Investment Navigator Pro",
    temperature = 0.4,
    maxTokens = 2_048,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
    perMinute = 20,
    perDay = 200,
    tools,
    responseFormat,
    reasoning,
  } = options;

  if (!apiKey) {
    throw new OpenRouterError("Missing OpenRouter API key", 401);
  }

  try {
    consume({ key: RATE_LIMIT_KEY, perMinute, perDay });
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      throw new OpenRouterError(err.message, 429, Math.ceil(err.retryAfterMs / 1000));
    }
    throw err;
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort);
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": appTitle,
    };
    if (referer) headers["HTTP-Referer"] = referer;

    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        ...(tools && tools.length > 0 ? { tools } : {}),
        ...(responseFormat ? { response_format: responseFormat } : {}),
        ...(reasoning ? { reasoning } : {}),
      }),
      signal: controller.signal,
    });

    if (response.status === 429) {
      const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
      reportBackoff(
        RATE_LIMIT_KEY,
        (retryAfter ?? 60) * 1000,
        "OpenRouter 429",
      );
      throw new OpenRouterError("OpenRouter rate limited", 429, retryAfter);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new OpenRouterError(
        `OpenRouter HTTP ${response.status}: ${text.slice(0, 200)}`,
        response.status,
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    if (!content) {
      throw new OpenRouterError("OpenRouter returned empty content", 502);
    }
    return content;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new OpenRouterError("OpenRouter request timed out", 504);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

/**
 * Convenience wrapper that falls back to the secondary model once on failure.
 */
export async function callOpenRouterWithFallback(
  messages: OpenRouterMessage[],
  options: OpenRouterOptions,
): Promise<{ content: string; model: string }> {
  const primary = options.model ?? OPENROUTER_DEFAULT_MODEL;
  try {
    const content = await callOpenRouter(messages, { ...options, model: primary });
    return { content, model: primary };
  } catch (err) {
    if (isOpenRouterRateLimit(err)) throw err; // don't mask caps
    const fallback = primary === OPENROUTER_FALLBACK_MODEL
      ? OPENROUTER_DEFAULT_MODEL
      : OPENROUTER_FALLBACK_MODEL;
    const content = await callOpenRouter(messages, { ...options, model: fallback });
    return { content, model: fallback };
  }
}

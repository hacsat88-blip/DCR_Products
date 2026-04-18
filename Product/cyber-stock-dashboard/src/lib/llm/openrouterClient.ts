import { z, ZodType } from "zod";

export type LLMErrorKind = "rate_limit" | "auth" | "invalid_response" | "network";

export class LLMError extends Error {
  readonly kind: LLMErrorKind;
  readonly status?: number;
  readonly cause?: unknown;

  constructor(kind: LLMErrorKind, message: string, options?: { status?: number; cause?: unknown }) {
    super(message);
    this.name = "LLMError";
    this.kind = kind;
    this.status = options?.status;
    this.cause = options?.cause;
  }
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ResponseFormat<T> {
  schema: ZodType<T>;
  /** JSON schema 名 (OpenRouter 表示用) */
  name?: string;
}

export interface ChatOptions<T = string> {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: ResponseFormat<T>;
  signal?: AbortSignal;
  /** テスト用に差し替え可能 */
  fetchImpl?: typeof fetch;
  /** リトライ回数 (default 3) */
  maxRetries?: number;
  /** リトライ間スリープ (テスト時に短縮可) */
  sleepImpl?: (ms: number) => Promise<void>;
  /** ベース URL (デフォルト OpenRouter) */
  baseUrl?: string;
  /** API キー (省略時は env.OPENROUTER_API_KEY) */
  apiKey?: string;
}

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

function normalizeSecret(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let value = raw.trim();
  if (!value) return undefined;
  const wrappedInDoubleQuote = value.startsWith('"') && value.endsWith('"');
  const wrappedInSingleQuote = value.startsWith("'") && value.endsWith("'");
  if (wrappedInDoubleQuote || wrappedInSingleQuote) {
    value = value.slice(1, -1).trim();
  }
  return value || undefined;
}

interface OpenRouterChoice {
  message?: { content?: string | null };
}
interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
}

function classifyHttpStatus(status: number): LLMErrorKind {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "network";
  return "invalid_response";
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * OpenRouter chat completion 呼び出し。
 * - responseFormat 未指定: string を返す
 * - responseFormat 指定:    Zod parse した object を返す
 */
export async function chat(options: ChatOptions<string>): Promise<string>;
export async function chat<T>(options: ChatOptions<T> & { responseFormat: ResponseFormat<T> }): Promise<T>;
export async function chat<T>(options: ChatOptions<T>): Promise<T | string> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const sleep = options.sleepImpl ?? defaultSleep;
  const maxRetries = options.maxRetries ?? 3;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const apiKey = normalizeSecret(options.apiKey ?? process.env.OPENROUTER_API_KEY);

  if (!fetchImpl) {
    throw new LLMError("network", "fetch is not available in this environment");
  }
  if (!apiKey) {
    throw new LLMError("auth", "OPENROUTER_API_KEY is not set");
  }

  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    temperature: options.temperature ?? 0.2,
  };
  if (options.maxTokens !== undefined) body.max_tokens = options.maxTokens;

  if (options.responseFormat) {
    let jsonSchema: unknown;
    try {
      jsonSchema = z.toJSONSchema(options.responseFormat.schema);
    } catch (err) {
      throw new LLMError("invalid_response", "failed to derive JSON schema from Zod type", {
        cause: err,
      });
    }
    body.response_format = {
      type: "json_schema",
      json_schema: {
        name: options.responseFormat.name ?? "response",
        strict: true,
        schema: jsonSchema,
      },
    };
  }

  let lastError: LLMError | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let response: Response;
    try {
      response = await fetchImpl(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: options.signal,
      });
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") {
        throw new LLMError("network", "request aborted", { cause: err });
      }
      lastError = new LLMError("network", "fetch failed", { cause: err });
      if (attempt < maxRetries - 1) {
        await sleep(2 ** attempt * 250);
        continue;
      }
      throw lastError;
    }

    if (!response.ok) {
      const text = await safeReadText(response);
      const kind = classifyHttpStatus(response.status);
      const err = new LLMError(kind, `OpenRouter HTTP ${response.status}: ${text}`, {
        status: response.status,
      });
      if (isRetryable(response.status) && attempt < maxRetries - 1) {
        lastError = err;
        await sleep(2 ** attempt * 250);
        continue;
      }
      throw err;
    }

    let json: OpenRouterResponse;
    try {
      json = (await response.json()) as OpenRouterResponse;
    } catch (err) {
      throw new LLMError("invalid_response", "failed to parse JSON body", { cause: err });
    }

    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      throw new LLMError("invalid_response", "missing message.content in response");
    }

    if (!options.responseFormat) {
      return content;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(content);
    } catch (err) {
      throw new LLMError("invalid_response", "model output is not valid JSON", { cause: err });
    }
    const result = options.responseFormat.schema.safeParse(parsedJson);
    if (!result.success) {
      throw new LLMError("invalid_response", "model output failed schema validation", {
        cause: result.error,
      });
    }
    return result.data;
  }

  throw lastError ?? new LLMError("network", "exhausted retries with no response");
}

// ---------------- chatStream (token streaming) ----------------

export type ChatStreamOptions = Omit<ChatOptions<unknown>, "responseFormat">;

/**
 * OpenRouter chat completion streaming 呼び出し。
 * SSE (`data: {...}\n\n`) を逐次パースして AsyncIterable<string> (delta) を返す。
 * - 認証エラー / 接続エラーは LLMError を throw
 * - 中断時は AbortError を throw
 */
export async function* chatStream(
  options: ChatStreamOptions,
): AsyncGenerator<string, void, unknown> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const apiKey = normalizeSecret(options.apiKey ?? process.env.OPENROUTER_API_KEY);

  if (!fetchImpl) {
    throw new LLMError("network", "fetch is not available in this environment");
  }
  if (!apiKey) {
    throw new LLMError("auth", "OPENROUTER_API_KEY is not set");
  }

  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    temperature: options.temperature ?? 0.4,
    stream: true,
  };
  if (options.maxTokens !== undefined) body.max_tokens = options.maxTokens;

  let response: Response;
  try {
    response = await fetchImpl(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
      signal: options.signal,
    });
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") {
      throw new LLMError("network", "request aborted", { cause: err });
    }
    throw new LLMError("network", "fetch failed", { cause: err });
  }

  if (!response.ok) {
    const text = await safeReadText(response);
    throw new LLMError(
      classifyHttpStatus(response.status),
      `OpenRouter HTTP ${response.status}: ${text}`,
      { status: response.status },
    );
  }
  if (!response.body) {
    throw new LLMError("invalid_response", "stream response has no body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line || !line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") return;
        try {
          const obj = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const delta = obj.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) {
            yield delta;
          }
        } catch {
          // ignore malformed chunk
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // noop
    }
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

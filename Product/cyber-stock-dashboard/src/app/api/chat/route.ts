import { NextResponse } from "next/server";
import { z } from "zod";
import {
  chatWithHistory,
  chatWithHistoryStream,
  type ChatTurn,
} from "@/lib/llm/router";
import { LLMError } from "@/lib/llm/openrouterClient";
import { clientIpFromRequest, rateLimit } from "@/lib/rateLimitMemory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(20),
  context: z
    .object({
      tickers: z.array(z.string().max(20)).max(20).optional(),
      sector: z.string().max(80).optional(),
      market: z.string().max(20).optional(),
    })
    .optional(),
  stream: z.boolean().optional().default(true),
});
type ChatContext = z.infer<typeof ChatRequestSchema>["context"];

const FOOTER = "\n\n※参考情報。最終判断はご自身で。";
const RATE_KEY = "chat";
const CHAT_AUTH_ERROR_MESSAGE =
  "AIチャットの認証に失敗しました。OpenRouter APIキーの無効・期限切れ、またはアカウント不一致の可能性があります。管理者設定を確認してください。";
const CHAT_GENERIC_ERROR_MESSAGE =
  "AIチャットの応答取得に失敗しました。時間をおいて再試行してください。";
const CHAT_JAPANESE_RETRY_MESSAGE =
  "AIチャットの応答を日本語で生成できませんでした。恐れ入りますが、時間をおいて再度お試しください。";
const STREAM_INTERRUPTED_WARNING = "配信が途中で中断されました。";
const STREAM_INTERRUPTED_MESSAGE =
  "AIチャットの配信が途中で中断されたため、日本語で確認できた内容に切り替えました。";

type PublicChatError = {
  status: number;
  error: string;
  message: string;
};

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

function mapChatError(err: unknown): PublicChatError {
  if (err instanceof LLMError && err.kind === "auth") {
    return {
      status: 401,
      error: "llm_auth_failed",
      message: CHAT_AUTH_ERROR_MESSAGE,
    };
  }

  if (err instanceof LLMError && err.kind === "rate_limit") {
    return {
      status: 429,
      error: "llm_rate_limited",
      message: "AIチャットが混み合っています。少し待って再試行してください。",
    };
  }

  return {
    status: 500,
    error: "llm_error",
    message: CHAT_GENERIC_ERROR_MESSAGE,
  };
}

function safeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.length > 400 ? `${raw.slice(0, 400)}...` : raw;
}

function logChatError(stage: string, err: unknown, mapped: PublicChatError): void {
  console.error("[/api/chat] request failed", {
    stage,
    publicError: mapped.error,
    publicStatus: mapped.status,
    llmKind: err instanceof LLMError ? err.kind : null,
    llmStatus: err instanceof LLMError ? err.status : null,
    errorMessage: safeErrorMessage(err),
  });
}

function buildContextPrefix(context: ChatContext): string | null {
  if (!context) return null;
  const parts: string[] = [];
  if (context.tickers?.length)
    parts.push(`ティッカー: ${context.tickers.join(", ")}`);
  if (context.sector) parts.push(`セクター: ${context.sector}`);
  if (context.market) parts.push(`市場: ${context.market}`);
  return parts.length ? `[対象: ${parts.join(" / ")}]\n` : null;
}

function injectContext(messages: ChatTurn[], context: ChatContext): ChatTurn[] {
  const prefix = buildContextPrefix(context);
  if (!prefix) return messages;
  const idx = messages.findIndex((m) => m.role === "user");
  if (idx < 0) return messages;
  return messages.map((m, i) =>
    i === idx ? { ...m, content: prefix + m.content } : m,
  );
}

function sseChunk(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function stripFooter(text: string): string {
  return text.split(FOOTER).join("").trim();
}

function isJapaneseText(text: string): boolean {
  return /[ぁ-んァ-ヶ一-龠々ー]/.test(text);
}

function normalizeJapaneseAssistantText(text: string): string {
  const content = stripFooter(text);
  if (!content) return CHAT_JAPANESE_RETRY_MESSAGE;
  return isJapaneseText(content) ? content : CHAT_JAPANESE_RETRY_MESSAGE;
}

function normalizeJapaneseAssistantDeltas(deltas: string[]): string[] {
  const raw = deltas.join("");
  const normalized = normalizeJapaneseAssistantText(raw);
  return normalized === stripFooter(raw) ? deltas : [normalized];
}

export async function POST(req: Request) {
  if (!normalizeSecret(process.env.OPENROUTER_API_KEY)) {
    return NextResponse.json(
      { error: "llm_unconfigured", message: "LLM 未設定です" },
      { status: 503 },
    );
  }

  const ip = clientIpFromRequest(req);
  const rl = rateLimit(RATE_KEY, ip, { max: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "リクエストが多すぎます。少し待って再試行してください。",
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 30) } },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = ChatRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const history = injectContext(
    parsed.data.messages as ChatTurn[],
    parsed.data.context,
  );
  const wantStream = parsed.data.stream;

  if (!wantStream) {
    try {
      const text = await chatWithHistory(history);
      return NextResponse.json({
        content: normalizeJapaneseAssistantText(text) + FOOTER,
      });
    } catch (err) {
      const mapped = mapChatError(err);
      logChatError("non_stream", err, mapped);
      return NextResponse.json(
        {
          error: mapped.error,
          message: mapped.message,
        },
        { status: mapped.status },
      );
    }
  }

  // -------- streaming (SSE) --------
  const encoder = new TextEncoder();
  let usedFallback = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: object) =>
        controller.enqueue(encoder.encode(sseChunk(obj)));
      try {
        let finalDeltas: string[] = [];
        const deltas: string[] = [];
        try {
          for await (const delta of chatWithHistoryStream(history)) {
            deltas.push(delta);
          }
          finalDeltas = normalizeJapaneseAssistantDeltas(deltas);
        } catch (streamErr) {
          const mappedStreamErr = mapChatError(streamErr);
          logChatError("stream_primary", streamErr, mappedStreamErr);
          usedFallback = true;
          if (deltas.length > 0) {
            finalDeltas = normalizeJapaneseAssistantDeltas(deltas);
            send({
              warning: STREAM_INTERRUPTED_WARNING,
              message: STREAM_INTERRUPTED_MESSAGE,
            });
          } else {
            try {
              const text = await chatWithHistory(history);
              finalDeltas = [normalizeJapaneseAssistantText(text)];
            } catch (fallbackErr) {
              const mappedFallbackErr = mapChatError(fallbackErr);
              logChatError("stream_fallback", fallbackErr, mappedFallbackErr);
              send({
                error: mappedFallbackErr.error,
                message: mappedFallbackErr.message,
                status: mappedFallbackErr.status,
              });
            }
          }
        }
        if (finalDeltas.length > 0) {
          for (const delta of finalDeltas) {
            send({ delta });
          }
          send({ delta: FOOTER });
        }
        send({ done: true, fallback: usedFallback });
      } catch (err) {
        const mapped = mapChatError(err);
        logChatError("stream_unhandled", err, mapped);
        send({
          error: mapped.error,
          message: mapped.message,
          status: mapped.status,
        });
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}


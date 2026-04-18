import { NextResponse } from "next/server";
import { z } from "zod";
import {
  chatWithHistory,
  chatWithHistoryStream,
  type ChatTurn,
} from "@/lib/llm/router";
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

export async function POST(req: Request) {
  if (!process.env.OPENROUTER_API_KEY) {
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
      return NextResponse.json({ content: text + FOOTER });
    } catch (err) {
      return NextResponse.json(
        {
          error: "llm_error",
          message: err instanceof Error ? err.message : String(err),
        },
        { status: 500 },
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
        let any = false;
        try {
          for await (const delta of chatWithHistoryStream(history)) {
            any = true;
            send({ delta });
          }
        } catch (streamErr) {
          usedFallback = true;
          if (any) {
            send({
              warning: "stream_interrupted",
              message:
                streamErr instanceof Error
                  ? streamErr.message
                  : String(streamErr),
            });
          } else {
            try {
              const text = await chatWithHistory(history);
              send({ delta: text });
            } catch (fallbackErr) {
              send({
                error: "llm_error",
                message:
                  fallbackErr instanceof Error
                    ? fallbackErr.message
                    : String(fallbackErr),
              });
            }
          }
        }
        send({ delta: FOOTER });
        send({ done: true, fallback: usedFallback });
      } catch (err) {
        send({
          error: "llm_error",
          message: err instanceof Error ? err.message : String(err),
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


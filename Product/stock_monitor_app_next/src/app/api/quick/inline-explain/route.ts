import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { callGeminiQuick, GeminiQuickError } from "@/services/geminiQuick";
import { getCached, hashKey, setCached } from "@/lib/llmCache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  label: z.string().min(1).max(80),
  value: z.union([z.string(), z.number()]).optional(),
  context: z.string().max(400).optional(),
  symbol: z.string().max(16).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiKey =
    process.env.OPENROUTER_API_KEY ??
    process.env.GOOGLE_API_KEY ??
    process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY not configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const key = `quick:inline:${await hashKey(parsed.data)}`;
  const cached = getCached<{ explanation: string }>(key);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  const { label, value, context, symbol } = parsed.data;
  const prompt = [
    "次の指標を個人投資家向けに 120 字以内で、直感的に理解できる日本語で解説してください。数式暗記を避け、実務的な意味に重点を置きます。",
    symbol ? `対象銘柄: ${symbol}` : "",
    `指標: ${label}${value !== undefined ? ` = ${value}` : ""}`,
    context ? `背景: ${context}` : "",
    "末尾に一言で「注意したい局面」を付けてください。",
  ].filter(Boolean).join("\n");

  try {
    const explanation = await callGeminiQuick(prompt, { apiKey, maxOutputTokens: 300 });
    setCached(key, { explanation }, 24 * 60 * 60 * 1000); // 24h
    return NextResponse.json({ explanation, cached: false });
  } catch (err) {
    if (err instanceof GeminiQuickError) {
      return NextResponse.json(
        { error: err.message, retryAfterSeconds: err.retryAfterSeconds },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

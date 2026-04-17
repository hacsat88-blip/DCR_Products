import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { callGeminiQuick, GeminiQuickError } from "@/services/geminiQuick";
import { getCached, hashKey, setCached } from "@/lib/llmCache";
import type { NewsItem } from "@/services/news/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NewsItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  summary: z.string().nullable(),
  publishedAt: z.string(),
  source: z.string(),
  region: z.enum(["JP", "US", "GLOBAL"]),
  symbols: z.array(z.string()).default([]),
  language: z.enum(["ja", "en"]).default("ja"),
});

const RequestSchema = z.object({
  items: z.array(NewsItemSchema).min(1).max(20),
  focus: z.string().max(200).optional(),
  language: z.enum(["ja", "en"]).default("ja"),
});

function buildPrompt(items: z.infer<typeof NewsItemSchema>[], focus: string | undefined, language: "ja" | "en"): string {
  const header = language === "ja"
    ? "次のニュース一覧を読み、投資家に向けて3〜5項目のバレットで要約してください。価格への含意（上昇/下落/中立）も末尾に付与。"
    : "Summarize the following news for investors in 3-5 bullets. End with a bullet stating price implication (bullish/bearish/neutral).";
  const focusLine = focus ? (language === "ja" ? `焦点: ${focus}\n` : `Focus: ${focus}\n`) : "";
  const body = items
    .map((it, i) => `#${i + 1} [${it.source}/${it.region}] ${it.title}\n${it.url}\n${it.summary ?? ""}`)
    .join("\n\n");
  return `${header}\n${focusLine}\n${body}`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Quick tier now routes through OpenRouter to avoid Google side quotas.
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
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const key = `quick:news:${await hashKey(parsed.data)}`;
  const cached = getCached<{ summary: string }>(key);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  const prompt = buildPrompt(parsed.data.items, parsed.data.focus, parsed.data.language);
  try {
    const summary = await callGeminiQuick(prompt, { apiKey, maxOutputTokens: 600 });
    const payload = { summary, cached: false };
    setCached(key, { summary }, 30 * 60 * 1000); // 30 min
    return NextResponse.json(payload);
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

export type { NewsItem };

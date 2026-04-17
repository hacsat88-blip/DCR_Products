import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCached, hashKey, setCached } from "@/lib/llmCache";
import { explainWhyMoved, WhyMovedError, type WhyMovedResult } from "@/services/whyMoved";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ArticleSchema = z.object({
  title: z.string().min(1).max(300),
  url: z.string().url().optional(),
  snippet: z.string().max(600).optional(),
});

const RequestSchema = z.object({
  ticker: z.string().min(1).max(16),
  moveContext: z.string().min(1).max(300),
  articles: z.array(ArticleSchema).max(10).optional(),
  useWebSearch: z.boolean().optional(),
  reasoningEffort: z.enum(["low", "medium", "high"]).optional(),
});

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
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

  // Cache per (ticker, moveContext, article-url-set) for 1h via llmCache TTL
  const cacheKey = `deep:why-moved:${await hashKey(parsed.data)}`;
  const cached = getCached<WhyMovedResult>(cacheKey);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  try {
    const result = await explainWhyMoved({
      apiKey,
      ticker: parsed.data.ticker,
      moveContext: parsed.data.moveContext,
      articles: parsed.data.articles,
      useWebSearch: parsed.data.useWebSearch,
      reasoningEffort: parsed.data.reasoningEffort,
      referer: req.nextUrl.origin,
    });
    setCached(cacheKey, result);
    return NextResponse.json({ ...result, cached: false });
  } catch (err) {
    if (err instanceof WhyMovedError) {
      return NextResponse.json(
        { error: err.message, retryAfterSeconds: err.retryAfterSeconds },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

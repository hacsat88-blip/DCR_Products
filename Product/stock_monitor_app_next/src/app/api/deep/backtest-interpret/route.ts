import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { callOpenRouterWithFallback, OpenRouterError } from "@/services/openrouter";
import { getCached, hashKey, setCached } from "@/lib/llmCache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NotableTradeSchema = z.object({
  entry: z.number(),
  exit: z.number(),
  pnlPct: z.number(),
});

const MetricsSchema = z.object({
  total: z.number(),
  sharpe: z.number(),
  dd: z.number(),
  winRate: z.number(),
});

const RequestSchema = z.object({
  initialCapital: z.number().positive(),
  strategy: z.enum(["sma_cross", "rsi_reversion", "buy_and_hold"]),
  metrics: MetricsSchema,
  notableTrades: z.array(NotableTradeSchema).max(20).optional(),
});

interface InterpretResponse {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  improvementIdeas: string[];
  riskNotes: string[];
  model: string;
}

function buildPrompt(payload: z.infer<typeof RequestSchema>): string {
  return [
    "あなたは運用戦略の検証と改善提案に長けたクオンツアナリストです。",
    "次のバックテスト結果を解釈し、定性的な改善示唆を日本語で提示してください。",
    "",
    "入力 JSON:",
    JSON.stringify(payload, null, 2),
    "",
    "次の JSON 形式で返答してください (追加コメント禁止):",
    '{"summary":"...","strengths":["..."],"weaknesses":["..."],"improvementIdeas":["..."],"riskNotes":["..."]}',
    "各配列は 2〜4 項目、各項目は 80 字以内、summary は 160 字以内。",
  ].join("\n");
}

function safeParseJson(raw: string): unknown {
  const fenced = raw.match(/```json\s*([\s\S]*?)\s*```/i);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  const candidate = start >= 0 && end > start ? body.slice(start, end + 1) : body;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function validate(parsed: unknown): InterpretResponse | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const summary = typeof obj.summary === "string" ? obj.summary.slice(0, 400) : "";
  if (!summary) return null;
  const asStringArray = (v: unknown): string[] => {
    if (!Array.isArray(v)) return [];
    return v
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.slice(0, 200));
  };
  return {
    summary,
    strengths: asStringArray(obj.strengths),
    weaknesses: asStringArray(obj.weaknesses),
    improvementIdeas: asStringArray(obj.improvementIdeas),
    riskNotes: asStringArray(obj.riskNotes),
    model: "",
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 503 });
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

  const cacheKey = `deep:backtest-interpret:${await hashKey(parsed.data)}`;
  const cached = getCached<InterpretResponse>(cacheKey);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  const prompt = buildPrompt(parsed.data);
  try {
    const { content, model } = await callOpenRouterWithFallback(
      [
        { role: "system", content: "You respond strictly in valid JSON with no additional commentary." },
        { role: "user", content: prompt },
      ],
      { apiKey, temperature: 0.2, maxTokens: 900 },
    );
    const parsedJson = safeParseJson(content);
    const validated = validate(parsedJson);
    if (!validated) {
      return NextResponse.json(
        { error: "Deep model returned non-parseable output", raw: content.slice(0, 400) },
        { status: 502 },
      );
    }
    validated.model = model;
    setCached(cacheKey, validated);
    return NextResponse.json({ ...validated, cached: false });
  } catch (err) {
    if (err instanceof OpenRouterError) {
      return NextResponse.json(
        { error: err.message, retryAfterSeconds: err.retryAfterSeconds },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

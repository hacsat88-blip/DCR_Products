import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { callOpenRouterWithFallback, OpenRouterError } from "@/services/openrouter";
import { getCached, hashKey, setCached } from "@/lib/llmCache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HoldingSchema = z.object({
  symbol: z.string().min(1).max(16),
  name: z.string().optional(),
  market: z.enum(["JP", "US"]),
  quantity: z.number().nonnegative(),
  averageCost: z.number().nonnegative(),
  currentPrice: z.number().nonnegative(),
  sector: z.string().optional(),
  acquiredAt: z.string().optional(),
});

const RequestSchema = z.object({
  baseCurrency: z.enum(["JPY", "USD"]).default("JPY"),
  riskTolerance: z.enum(["conservative", "balanced", "aggressive"]).default("balanced"),
  horizonYears: z.number().min(0.25).max(30).default(5),
  holdings: z.array(HoldingSchema).min(1).max(50),
  notes: z.string().max(400).optional(),
});

interface ReviewResponse {
  overallHealth: "strong" | "neutral" | "weak";
  concentrationWarnings: string[];
  sectorExposureComment: string;
  riskComment: string;
  actionItems: string[];
  rebalancingSuggestions: string[];
  model: string;
}

function buildPrompt(payload: z.infer<typeof RequestSchema>): string {
  return [
    "あなたは個人投資家向けのポートフォリオ・アドバイザーです。",
    "次の保有銘柄を分析し、集中リスク / セクター偏り / リスク許容度との整合 / 暫定アクション提案を評価してください。",
    "",
    `基準通貨: ${payload.baseCurrency}`,
    `リスク許容度: ${payload.riskTolerance}`,
    `投資期間: ${payload.horizonYears} 年`,
    payload.notes ? `メモ: ${payload.notes}` : "",
    "",
    "保有ポジション:",
    JSON.stringify(payload.holdings, null, 2),
    "",
    "出力は次の JSON 形式で返してください (追加テキスト禁止):",
    '{"overallHealth":"strong|neutral|weak",',
    '"concentrationWarnings":["..."],',
    '"sectorExposureComment":"...",',
    '"riskComment":"...",',
    '"actionItems":["..."],',
    '"rebalancingSuggestions":["..."]}',
    "各配列は最大 5 件、文字列は 120 字以内、日本語。",
  ].filter(Boolean).join("\n");
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

function validate(parsed: unknown): ReviewResponse | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const health = obj.overallHealth;
  if (health !== "strong" && health !== "neutral" && health !== "weak") return null;
  const asStringArray = (v: unknown): string[] => {
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === "string").slice(0, 5);
  };
  return {
    overallHealth: health,
    concentrationWarnings: asStringArray(obj.concentrationWarnings),
    sectorExposureComment: typeof obj.sectorExposureComment === "string" ? obj.sectorExposureComment.slice(0, 400) : "",
    riskComment: typeof obj.riskComment === "string" ? obj.riskComment.slice(0, 400) : "",
    actionItems: asStringArray(obj.actionItems),
    rebalancingSuggestions: asStringArray(obj.rebalancingSuggestions),
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

  const cacheKey = `deep:portfolio:${await hashKey(parsed.data)}`;
  const cached = getCached<ReviewResponse>(cacheKey);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  const prompt = buildPrompt(parsed.data);
  try {
    const { content, model } = await callOpenRouterWithFallback(
      [
        { role: "system", content: "You respond strictly in valid JSON with no additional commentary." },
        { role: "user", content: prompt },
      ],
      { apiKey, temperature: 0.2, maxTokens: 1200 },
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
    setCached(cacheKey, validated, 12 * 60 * 60 * 1000); // 12h
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

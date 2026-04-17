import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { callOpenRouterWithFallback, OpenRouterError } from "@/services/openrouter";
import { getCached, hashKey, setCached } from "@/lib/llmCache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FundamentalsSchema = z.object({
  symbol: z.string().min(1).max(16),
  name: z.string().optional(),
  market: z.enum(["JP", "US"]),
  per: z.number().nullable().optional(),
  pbr: z.number().nullable().optional(),
  roe: z.number().nullable().optional(),
  equityRatio: z.number().nullable().optional(),
  revenueGrowth: z.number().nullable().optional(),
  epsGrowth: z.number().nullable().optional(),
  dividendYield: z.number().nullable().optional(),
  priceChange30d: z.number().nullable().optional(),
  priceChange90d: z.number().nullable().optional(),
  sector: z.string().optional(),
  notes: z.string().max(400).optional(),
});

const RequestSchema = z.object({
  fundamentals: FundamentalsSchema,
});

const AXES = ["growth", "value", "profit", "safety", "momentum"] as const;
type AxisKey = (typeof AXES)[number];

interface RadarResponse {
  scores: Record<AxisKey, number>;
  rationale: Record<AxisKey, string>;
  overall: number;
  model: string;
}

function buildPrompt(payload: z.infer<typeof RequestSchema>): string {
  return [
    "あなたは日本と米国株式市場に精通した投資アナリストです。",
    "次のファンダメンタルをもとに、5軸 (growth, value, profit, safety, momentum) それぞれを 0〜100 のスコアで評価してください。",
    "評価基準:",
    "- growth: 売上・EPS 成長率、業種平均比較",
    "- value: PER / PBR に基づく相対的割安度 (低いほどスコア高)",
    "- profit: ROE・利益率の水準と安定性",
    "- safety: 自己資本比率、財務レバレッジ、配当継続性",
    "- momentum: 直近 30 / 90 日の株価変化、業界相対モメンタム",
    "",
    "入力 JSON:",
    JSON.stringify(payload.fundamentals, null, 2),
    "",
    "出力は次の JSON フォーマットで返してください (追加テキスト禁止):",
    '{"scores":{"growth":0,"value":0,"profit":0,"safety":0,"momentum":0},',
    '"rationale":{"growth":"...","value":"...","profit":"...","safety":"...","momentum":"..."}}',
    "各 rationale は 60 字以内、日本語で記述。",
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

function validateScores(parsed: unknown): RadarResponse | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as { scores?: unknown; rationale?: unknown };
  if (!obj.scores || typeof obj.scores !== "object") return null;
  if (!obj.rationale || typeof obj.rationale !== "object") return null;
  const scores = obj.scores as Record<string, unknown>;
  const rationale = obj.rationale as Record<string, unknown>;
  const out: Record<AxisKey, number> = { growth: 0, value: 0, profit: 0, safety: 0, momentum: 0 };
  const outRationale: Record<AxisKey, string> = { growth: "", value: "", profit: "", safety: "", momentum: "" };
  for (const axis of AXES) {
    const raw = scores[axis];
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
    if (!Number.isFinite(n)) return null;
    out[axis] = Math.max(0, Math.min(100, Math.round(n)));
    const why = rationale[axis];
    outRationale[axis] = typeof why === "string" ? why.slice(0, 120) : "";
  }
  const overall = Math.round(AXES.reduce((s, a) => s + out[a], 0) / AXES.length);
  return { scores: out, rationale: outRationale, overall, model: "" };
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

  const cacheKey = `deep:radar:${await hashKey(parsed.data)}`;
  const cached = getCached<RadarResponse>(cacheKey);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  const prompt = buildPrompt(parsed.data);
  try {
    const { content, model } = await callOpenRouterWithFallback(
      [
        { role: "system", content: "You respond strictly in valid JSON with no additional commentary." },
        { role: "user", content: prompt },
      ],
      { apiKey, temperature: 0.1, maxTokens: 800 },
    );
    const parsedJson = safeParseJson(content);
    const validated = validateScores(parsedJson);
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

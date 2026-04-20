import { NextResponse } from "next/server";
import { z } from "zod";
import { createJQuantsClient } from "@/lib/providers/jquants";
import { fetchPriceSeries } from "@/lib/services/prices";
import { analyzeStock } from "@/lib/llm/router";
import { normalizeJpCode } from "@/lib/services/analysis/etfList";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  code: z.string().min(1).max(20),
  market: z.enum(["JP", "US"]),
  name: z.string().optional(),
  style: z
    .enum(["短期値幅狙い", "中期テーマ", "長期成長", "配当重視", "総合"])
    .optional(),
  riskTolerance: z.enum(["low", "mid", "high"]).optional(),
});
const jquantsClient = createJQuantsClient();

function buildPriceContext(candles: {
  t?: number;
  date?: string;
  c?: number;
  close?: number;
  o?: number;
  open?: number;
  h?: number;
  high?: number;
  l?: number;
  low?: number;
}[]): string {
  if (candles.length === 0) return "価格データなし";
  const recent = candles.slice(-30);
  const closes = recent
    .map((c) => c.c ?? c.close ?? null)
    .filter((v): v is number => v != null);
  if (closes.length === 0) return "価格データなし";
  const first = closes[0];
  const last = closes[closes.length - 1];
  const hi = Math.max(...closes);
  const lo = Math.min(...closes);
  const pct = first > 0 ? (((last - first) / first) * 100).toFixed(1) : "N/A";
  return [
    `直近${recent.length}日: 始値≈${first.toFixed(0)}, 現値≈${last.toFixed(0)}, 高値≈${hi.toFixed(0)}, 安値≈${lo.toFixed(0)}, 騰落率≈${pct}%`,
    `データ件数: ${candles.length}本`,
  ].join("\n");
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { code, market, name, style, riskTolerance } = parsed.data;
  const normalizedCode = market === "JP" ? normalizeJpCode(code) : code.toUpperCase();

  // 銘柄名取得 (JP のみ J-Quants から)
  let resolvedName = name;
  if (!resolvedName && market === "JP") {
    try {
      const listed = await jquantsClient.getListedInfo();
      const item = listed.find(
        (i) => normalizeJpCode(i.Code) === normalizedCode,
      );
      resolvedName = item?.CompanyName ?? item?.CompanyNameEnglish;
    } catch {
      // 名称取得失敗は無視して続行
    }
  }

  // 価格データ取得
  let priceContext = "価格データ取得失敗";
  try {
    const result = await fetchPriceSeries(
      normalizedCode,
      market === "JP" ? "jp" : "us",
      60,
      {},
    );
    priceContext = buildPriceContext(result.candles);
  } catch {
    // 価格取得失敗でも LLM 分析は実行する
  }

  // LLM 分析
  try {
    const analysis = await analyzeStock({
      code: normalizedCode,
      name: resolvedName,
      market,
      priceContext,
      style: style ?? "総合",
      riskTolerance: riskTolerance ?? "mid",
    });
    return NextResponse.json({ data: analysis });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "analyze_failed" },
      { status: 502 },
    );
  }
}

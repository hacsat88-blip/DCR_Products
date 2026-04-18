import { NextResponse } from "next/server";
import { detectMarketAnomaly } from "@/lib/llm/router";
import { getAllIndices } from "@/lib/services/marketIndices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNAL_TO_BADGE: Record<string, "go" | "fix" | "stop"> = {
  "🟢": "go",
  "🟡": "fix",
  "🔴": "stop",
};

const FALLBACK_RESULT = {
  signal: "🟢" as const,
  level: "normal" as const,
  badge: "go" as const,
  reasons: ["地合い判定オフライン (データ不足)"],
  recommendedAction: "通常モード。ニュースと指数の動向を継続監視してください。",
  fallback: true as const,
};

export async function GET(): Promise<Response> {
  const asOf = new Date().toISOString();
  try {
    const indices = await getAllIndices("daily");
    const snapshot: Record<string, string> = {};
    for (const i of indices) {
      if (i.latest) {
        snapshot[i.id] =
          `${i.latest.close.toFixed(2)} (${i.latest.changePercent.toFixed(2)}%)`;
      }
    }

    if (!process.env.OPENROUTER_API_KEY) {
      // LLM 未設定 → ヒューリスティック
      const max = Math.max(
        0,
        ...indices.map((i) => Math.abs(i.latest?.changePercent ?? 0)),
      );
      const sig: "🟢" | "🟡" | "🔴" =
        max < 1.5 ? "🟢" : max < 3 ? "🟡" : "🔴";
      return NextResponse.json(
        {
          signal: sig,
          level: sig === "🟢" ? "normal" : sig === "🟡" ? "caution" : "storm",
          badge: SIGNAL_TO_BADGE[sig],
          reasons: [`主要指数の最大変動率 ${max.toFixed(2)}%`],
          recommendedAction:
            sig === "🟢"
              ? "通常モード。継続観察。"
              : "ボラティリティ拡大に注意。ポジションを点検してください。",
          asOf,
          fallback: true,
        },
        { headers: { "cache-control": "public, max-age=300" } },
      );
    }

    const result = await detectMarketAnomaly({
      asOf,
      indices: snapshot,
      notes: "v4.1 BOUNDARY: 断定・売買推奨を避けること。",
    });
    return NextResponse.json(
      {
        signal: result.signal,
        level: result.level,
        badge: SIGNAL_TO_BADGE[result.signal] ?? "go",
        reasons: result.reasons,
        recommendedAction: result.recommendedAction,
        asOf,
        fallback: false,
      },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  } catch (e) {
    return NextResponse.json(
      { ...FALLBACK_RESULT, asOf, error: String(e) },
      { headers: { "cache-control": "public, max-age=60" } },
    );
  }
}

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { createJQuantsClient } from "@/lib/providers/jquants";
import { createAlphaVantageClient } from "@/lib/providers/alphaVantage";
import {
  screenCandidates,
  DISCLAIMER_TEXT,
} from "@/lib/services/analysis/screener";
import { AnalyzeRequestSchema } from "@/lib/services/analysis/analyzeSchema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", disclaimer: DISCLAIMER_TEXT },
      { status: 400 },
    );
  }

  const parsed = AnalyzeRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "validation_error",
        details: parsed.error.flatten(),
        disclaimer: DISCLAIMER_TEXT,
      },
      { status: 400 },
    );
  }

  const reqBody = parsed.data;
  try {
    const db = getDb();
    const result = await screenCandidates(reqBody, {
      db,
      jp:
        reqBody.market === "JP" || reqBody.market === "BOTH"
          ? { jquants: createJQuantsClient() }
          : undefined,
      us:
        reqBody.market === "US" || reqBody.market === "BOTH"
          ? { alphaVantage: createAlphaVantageClient() }
          : undefined,
    });

    return NextResponse.json({
      data: {
        analyses: result.analyses,
        candidates: result.candidates,
        cacheHits: result.cacheHits,
        cacheMisses: result.cacheMisses,
        warnings: result.warnings,
      },
      disclaimer: DISCLAIMER_TEXT,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "internal_error",
        message: err instanceof Error ? err.message : String(err),
        disclaimer: DISCLAIMER_TEXT,
      },
      { status: 500 },
    );
  }
}

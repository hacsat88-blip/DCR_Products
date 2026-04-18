import { NextResponse } from "next/server";
import { z } from "zod";
import { extractIntent } from "@/lib/llm/router";
import { DISCLAIMER_TEXT } from "@/lib/services/analysis/screener";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IntentRequestSchema = z.object({
  text: z.string().min(1).max(2000),
});

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

  const parsed = IntentRequestSchema.safeParse(json);
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

  try {
    const intent = await extractIntent(parsed.data.text);
    return NextResponse.json({
      data: intent,
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

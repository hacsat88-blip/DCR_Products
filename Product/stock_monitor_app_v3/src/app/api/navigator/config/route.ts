import { NextResponse } from "next/server";

// ── GET /api/navigator/config ───────────────────
// Returns whether a Gemini API key is configured.

export async function GET(): Promise<NextResponse> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  return NextResponse.json({
    apiKey: apiKey || null,
    hasKey: !!apiKey,
  });
}

import { NextResponse } from "next/server";
import {
  buildPicks,
  resolveDefaultDeps,
  DISCLAIMER_TEXT,
} from "@/lib/services/picks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const data = await buildPicks(resolveDefaultDeps());
    return NextResponse.json(data, {
      headers: {
        "cache-control":
          "public, max-age=21600, stale-while-revalidate=43200",
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        items: [],
        warnings: [e instanceof Error ? e.message : String(e)],
        asOf: new Date().toISOString(),
        disclaimer: DISCLAIMER_TEXT,
      },
      { status: 500 },
    );
  }
}

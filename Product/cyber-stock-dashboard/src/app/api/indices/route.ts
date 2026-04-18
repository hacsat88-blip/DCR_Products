import { NextResponse } from "next/server";
import { getAllIndices, type IndexRange } from "@/lib/services/marketIndices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const rawRange = url.searchParams.get("range");
  const range: IndexRange = rawRange === "weekly" ? "weekly" : "daily";

  try {
    const items = await getAllIndices(range);
    return NextResponse.json(
      { items, range, asOf: new Date().toISOString() },
      {
        headers: {
          "cache-control": "public, max-age=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (e) {
    return NextResponse.json(
      { error: "indices_fetch_failed", detail: String(e) },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { desc, gte } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { portfolioSnapshot } from "@/lib/db/schema";
import { snapshotDailyValuation } from "@/lib/services/portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RANGE_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rangeKey = url.searchParams.get("range") ?? "30d";
    const days = RANGE_DAYS[rangeKey] ?? 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const db = getDb();
    const rows = db
      .select()
      .from(portfolioSnapshot)
      .where(gte(portfolioSnapshot.date, cutoff))
      .orderBy(desc(portfolioSnapshot.date))
      .all();
    rows.sort((a, b) => (a.date < b.date ? -1 : 1));
    return NextResponse.json(
      { items: rows, range: rangeKey, count: rows.length },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ error: msg, items: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  const expectedLegacyKey = process.env.CRON_KEY;

  if (expectedSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  } else if (expectedLegacyKey) {
    const legacyKey = req.headers.get("x-cron-key");
    if (legacyKey !== expectedLegacyKey) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  } else {
    return NextResponse.json(
      { error: "cron_auth_not_configured" },
      { status: 503 },
    );
  }

  try {
    const result = await snapshotDailyValuation();
    return NextResponse.json({ data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

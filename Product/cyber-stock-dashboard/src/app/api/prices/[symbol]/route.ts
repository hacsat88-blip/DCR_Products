import { NextResponse } from "next/server";
import { z } from "zod";
import { buildPriceResponse } from "@/lib/services/prices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  market: z.enum(["jp", "us"]).default("us"),
  interval: z.enum(["1d", "1w"]).default("1d"),
  days: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .pipe(z.number().int().min(7).max(1825).optional()),
});

export async function GET(
  req: Request,
  ctx: { params: Promise<{ symbol: string }> },
): Promise<Response> {
  const params = await ctx.params;
  const symbol = decodeURIComponent(params.symbol ?? "").trim();
  if (!symbol) {
    return NextResponse.json(
      { error: "missing_symbol", fallback: false },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    market: url.searchParams.get("market") ?? undefined,
    interval: url.searchParams.get("interval") ?? undefined,
    days: url.searchParams.get("days") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_query",
        detail: parsed.error.flatten(),
        fallback: false,
      },
      { status: 400 },
    );
  }

  const { market, interval } = parsed.data;
  const days = parsed.data.days ?? 180;

  try {
    const body = await buildPriceResponse(symbol, market, interval, days, {});
    return NextResponse.json(body, {
      headers: {
        "cache-control": "public, max-age=1800, stale-while-revalidate=3600",
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "prices_fetch_failed",
        fallback: false,
      },
      { status: 502 },
    );
  }
}

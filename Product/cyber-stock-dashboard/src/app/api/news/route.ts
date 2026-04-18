import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchAllNews } from "@/lib/services/news/aggregator";

export const runtime = "nodejs";

const QuerySchema = z.object({
  symbols: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    ),
  sectors: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    ),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .pipe(z.number().int().positive().max(100).optional()),
  useCache: z
    .string()
    .optional()
    .transform((v) =>
      v === undefined ? undefined : v === "true" || v === "1",
    ),
});

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    symbols: url.searchParams.get("symbols") ?? undefined,
    sectors: url.searchParams.get("sectors") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    useCache: url.searchParams.get("useCache") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_query", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const items = await fetchAllNews(parsed.data);
    return NextResponse.json(
      { items, count: items.length },
      { headers: { "cache-control": "public, max-age=60" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: "news_fetch_failed", detail: String(e) },
      { status: 500 },
    );
  }
}

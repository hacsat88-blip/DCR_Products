import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  addOrUpdatePosition,
  listPortfolioWithValuation,
} from "@/lib/services/portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await listPortfolioWithValuation();
    return NextResponse.json({ data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const row = addOrUpdatePosition(body);
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: "validation_failed", issues: e.issues },
        { status: 400 },
      );
    }
    const msg = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

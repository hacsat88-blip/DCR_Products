import { NextResponse } from "next/server";
import { removePosition } from "@/lib/services/portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const numId = Number(id);
    if (!Number.isFinite(numId) || numId <= 0) {
      return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    }
    removePosition(numId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

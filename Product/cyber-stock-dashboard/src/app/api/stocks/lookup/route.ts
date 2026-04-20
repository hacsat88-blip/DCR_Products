import { NextResponse } from "next/server";
import { z } from "zod";
import { createJQuantsClient } from "@/lib/providers/jquants";
import {
  normalizeJpCode,
  usEtfName,
  jpEtfName,
} from "@/lib/services/analysis/etfList";
import { jpCompanyName } from "@/lib/services/analysis/jpCompanyList";
import usSymbolListJson from "@/lib/services/analysis/usSymbolList.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  code: z.string().min(1).max(20),
  market: z.enum(["JP", "US"]),
});

interface UsSymbolEntry {
  symbol: string;
  name: string;
}
const US_INDIVIDUALS: UsSymbolEntry[] = (
  usSymbolListJson as { individuals: UsSymbolEntry[] }
).individuals;
const jquantsClient = createJQuantsClient();

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    code: url.searchParams.get("code") ?? "",
    market: url.searchParams.get("market") ?? "JP",
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_query", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { code, market } = parsed.data;

  if (market === "US") {
    const upper = code.toUpperCase();
    // ETF allowlist
    const etfName = usEtfName(upper);
    if (etfName) {
      return NextResponse.json({
        data: { name: etfName, currency: "USD", sector: "ETF" },
      });
    }
    // 個別株リスト
    const entry = US_INDIVIDUALS.find(
      (e) => e.symbol.toUpperCase() === upper,
    );
    if (entry) {
      return NextResponse.json({
        data: { name: entry.name, currency: "USD", sector: null },
      });
    }
    // 見つからない場合もコード自体を返す
    return NextResponse.json({
      data: { name: upper, currency: "USD", sector: null },
    });
  }

  // JP
  const normalized = normalizeJpCode(code);

  // JP ETF allowlist
  const jpEtf = jpEtfName(normalized);
  if (jpEtf) {
    return NextResponse.json({
      data: { name: jpEtf, currency: "JPY", sector: "ETF" },
    });
  }

  // J-Quants listed info
  try {
    const listed = await jquantsClient.getListedInfo();
    const item = listed.find((i) => normalizeJpCode(i.Code) === normalized);
    if (item) {
      return NextResponse.json({
        data: {
          name: item.CompanyName ?? item.CompanyNameEnglish ?? normalized,
          currency: "JPY",
          sector: item.Sector17Code ?? null,
        },
      });
    }
  } catch (err) {
    console.warn("[stocks/lookup] J-Quants getListedInfo failed:", err);
  }

  // Local company name fallback
  const localName = jpCompanyName(normalized);
  if (localName) {
    return NextResponse.json({
      data: { name: localName, currency: "JPY", sector: null },
    });
  }

  return NextResponse.json({
    data: { name: normalized, currency: "JPY", sector: null },
  });
}

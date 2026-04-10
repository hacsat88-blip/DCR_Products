import { NextRequest, NextResponse } from "next/server";

import { DEFAULT_STOCK_CODES } from "@/services/providers/types";
import { searchYahooFinance } from "@/services/providers/yahooSearchProvider";
import { searchStocksWithClaudeFallback } from "@/services/claudeSearchProvider";

const SEARCH_MIN_QUERY_LENGTH = 2;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < SEARCH_MIN_QUERY_LENGTH) {
    return NextResponse.json({
      results: [],
      error: `検索文字数は${SEARCH_MIN_QUERY_LENGTH}文字以上で入力してください。`,
    }, { status: 400 });
  }

  const registeredCodes = new Set<string>(DEFAULT_STOCK_CODES);

  // Try Yahoo Finance web search first
  const webResults = await searchYahooFinance(query, registeredCodes);
  if (webResults.length > 0) {
    return NextResponse.json({ results: webResults, error: null });
  }

  // Fallback to local catalog
  const payload = await searchStocksWithClaudeFallback(query, {
    registeredCodes: DEFAULT_STOCK_CODES,
  });

  return NextResponse.json(payload);
}

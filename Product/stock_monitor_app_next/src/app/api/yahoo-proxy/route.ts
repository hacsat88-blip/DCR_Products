import { NextRequest, NextResponse } from "next/server";

const YAHOO_CHART_ENDPOINT = "https://query1.finance.yahoo.com/v8/finance/chart";
const MAX_SYMBOLS = 20;
const SYMBOL_PATTERN = /^[\^A-Za-z0-9\.\:\-_]{1,20}$/;

type YahooProxyItem = {
  symbol: string;
  ok: boolean;
  status: number | null;
  payload: unknown | null;
  error: string | null;
};

function parseSymbols(request: NextRequest): string[] {
  const rawSymbols = request.nextUrl.searchParams.get("symbols");
  const rawSymbol = request.nextUrl.searchParams.get("symbol");
  const values = (rawSymbols ?? rawSymbol ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const unique: string[] = [];
  for (const value of values) {
    if (!SYMBOL_PATTERN.test(value)) {
      continue;
    }
    if (!unique.includes(value)) {
      unique.push(value);
    }
    if (unique.length >= MAX_SYMBOLS) {
      break;
    }
  }
  return unique;
}

async function fetchYahooChart(symbol: string, interval: string, range: string): Promise<YahooProxyItem> {
  const url = new URL(`${YAHOO_CHART_ENDPOINT}/${encodeURIComponent(symbol)}`);
  url.searchParams.set("interval", interval);
  url.searchParams.set("range", range);

  try {
    const response = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000)
    });
    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }
    if (!response.ok) {
      return {
        symbol,
        ok: false,
        status: response.status,
        payload,
        error: `Yahoo request failed: HTTP ${response.status}`
      };
    }
    if (text && payload === null) {
      return {
        symbol,
        ok: false,
        status: response.status,
        payload: null,
        error: "Yahoo returned non-JSON payload"
      };
    }
    return {
      symbol,
      ok: true,
      status: response.status,
      payload,
      error: null
    };
  } catch (error) {
    return {
      symbol,
      ok: false,
      status: null,
      payload: null,
      error: error instanceof Error ? error.message : "Yahoo proxy failed"
    };
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const symbols = parseSymbols(request);
  if (symbols.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "symbol or symbols query is required",
        items: [] as YahooProxyItem[]
      },
      { status: 400 }
    );
  }

  const interval = request.nextUrl.searchParams.get("interval")?.trim() || "1d";
  const range = request.nextUrl.searchParams.get("range")?.trim() || "5d";
  const items = await Promise.all(symbols.map((symbol) => fetchYahooChart(symbol, interval, range)));
  const ok = items.some((item) => item.ok);

  return NextResponse.json(
    {
      ok,
      source: "YF",
      items,
      error: ok ? null : items.map((item) => `${item.symbol}: ${item.error ?? "unknown error"}`).join(" | ")
    },
    { status: ok ? 200 : 502 }
  );
}

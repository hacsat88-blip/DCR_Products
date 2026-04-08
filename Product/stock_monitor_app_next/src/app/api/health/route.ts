import { NextResponse } from "next/server";

interface ProviderResult {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

export async function GET(): Promise<NextResponse> {
  const results: Record<string, ProviderResult> = {};

  const yhStart = Date.now();
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/9424.T?range=1d&interval=1d",
      { signal: AbortSignal.timeout(5000) }
    );
    results.yahoo = { ok: res.ok, latencyMs: Date.now() - yhStart };
    if (!res.ok) results.yahoo.error = `HTTP ${res.status}`;
  } catch (e: unknown) {
    results.yahoo = {
      ok: false,
      latencyMs: Date.now() - yhStart,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const avStart = Date.now();
  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) throw new Error("API key not configured");
    const url = new URL("https://www.alphavantage.co/query");
    url.searchParams.set("function", "TIME_SERIES_DAILY_ADJUSTED");
    url.searchParams.set("symbol", "9424.TYO");
    url.searchParams.set("outputsize", "compact");
    url.searchParams.set("apikey", apiKey);
    const res = await fetch(
      url.toString(),
      { signal: AbortSignal.timeout(5000) }
    );
    results.alphaVantage = { ok: res.ok, latencyMs: Date.now() - avStart };
    if (!res.ok) results.alphaVantage.error = `HTTP ${res.status}`;
  } catch (e: unknown) {
    results.alphaVantage = {
      ok: false,
      latencyMs: Date.now() - avStart,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const edStart = Date.now();
  try {
    const apiKey = process.env.EDINET_DB_API_KEY;
    if (!apiKey) throw new Error("API key not configured");
    const res = await fetch(
      "https://edinetdb.jp/v1/companies?sec_code=94240",
      { headers: { "X-API-Key": apiKey }, signal: AbortSignal.timeout(5000) }
    );
    results.edinetDb = { ok: res.ok, latencyMs: Date.now() - edStart };
    if (!res.ok) results.edinetDb.error = `HTTP ${res.status}`;
  } catch (e: unknown) {
    results.edinetDb = {
      ok: false,
      latencyMs: Date.now() - edStart,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  return NextResponse.json(results);
}

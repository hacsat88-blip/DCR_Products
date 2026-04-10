import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Alpha Vantage – Intraday OHLC
// ---------------------------------------------------------------------------

const ALPHA_VANTAGE_BASE = "https://www.alphavantage.co/query";
const CACHE_TTL_SECONDS = 300; // 5 minutes

const VALID_INTERVALS = ["5min", "15min", "60min"] as const;
type Interval = (typeof VALID_INTERVALS)[number];

type OhlcPoint = {
  date: string; // ISO-8601 date-time string
  time: number; // Unix timestamp (seconds) for lightweight-charts
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type IntradayPayload = {
  symbol: string;
  interval: string;
  source: string;
  sourceLabel: "AV";
  ohlc: OhlcPoint[];
  asOf: string | null;
  sourceTimestamp: string | null;
  fetchedAt: string;
  error: string | null;
};

// ---------------------------------------------------------------------------
// In-memory cache (same pattern as /api/market-index)
// ---------------------------------------------------------------------------
const cache = new Map<string, { expiresAt: number; payload: IntradayPayload }>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Convert Alpha Vantage datetime string → Unix seconds */
function parseDatetime(dt: string): number {
  // Alpha Vantage format: "2024-01-15 09:05:00"
  // Replace the space so Date can parse it reliably across runtimes.
  const iso = dt.replace(" ", "T");
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000);
}

function emptyPayload(
  symbol: string,
  interval: string,
  error: string
): IntradayPayload {
  return {
    symbol,
    interval,
    source: "alpha_vantage",
    sourceLabel: "AV",
    ohlc: [],
    asOf: null,
    sourceTimestamp: null,
    fetchedAt: new Date().toISOString(),
    error,
  };
}

function toIsoDatetime(dt: string): string | null {
  const unixSeconds = parseDatetime(dt);
  if (unixSeconds === 0) {
    return null;
  }
  return new Date(unixSeconds * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// Fetch from Alpha Vantage
// ---------------------------------------------------------------------------

async function fetchIntraday(
  symbol: string,
  interval: Interval,
  apiKey: string
): Promise<IntradayPayload> {
  const url = new URL(ALPHA_VANTAGE_BASE);
  url.searchParams.set("function", "TIME_SERIES_INTRADAY");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("outputsize", "compact");
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url.toString(), { cache: "no-store" });

  if (!response.ok) {
    return emptyPayload(
      symbol,
      interval,
      `Alpha Vantage HTTP ${response.status}`
    );
  }

  const json = (await response.json()) as Record<string, unknown>;

  // Alpha Vantage signals errors via "Error Message" or "Note" (rate limit)
  if (json["Error Message"]) {
    return emptyPayload(symbol, interval, String(json["Error Message"]));
  }
  if (json["Note"]) {
    return emptyPayload(symbol, interval, String(json["Note"]));
  }

  // The time-series key depends on the interval
  const seriesKey = `Time Series (${interval})`;
  const series = json[seriesKey] as
    | Record<string, Record<string, string>>
    | undefined;

  if (!series || typeof series !== "object") {
    return emptyPayload(
      symbol,
      interval,
      `Missing "${seriesKey}" in response`
    );
  }

  const ohlc: OhlcPoint[] = Object.entries(series).map(
    ([datetime, values]) => ({
      date: datetime,
      time: parseDatetime(datetime),
      open: toNumber(values["1. open"]),
      high: toNumber(values["2. high"]),
      low: toNumber(values["3. low"]),
      close: toNumber(values["4. close"]),
      volume: toNumber(values["5. volume"]),
    })
  );

  // Sort chronologically (oldest → newest)
  ohlc.sort((a, b) => a.time - b.time);

  return {
    symbol,
    interval,
    source: "alpha_vantage",
    sourceLabel: "AV",
    ohlc,
    asOf: ohlc.length > 0 ? toIsoDatetime(ohlc[ohlc.length - 1].date) : null,
    sourceTimestamp: ohlc.length > 0 ? toIsoDatetime(ohlc[ohlc.length - 1].date) : null,
    fetchedAt: new Date().toISOString(),
    error: null,
  };
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;

  const symbol = params.get("symbol")?.trim() || "1321.T";
  const rawInterval = params.get("interval")?.trim().toLowerCase() ?? "5min";
  const interval: Interval = (VALID_INTERVALS as readonly string[]).includes(
    rawInterval
  )
    ? (rawInterval as Interval)
    : "5min";

  const cacheKey = `${symbol}-${interval}`;

  // --- Evict expired entries ---
  const now = Date.now();
  for (const [ck, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(ck);
    }
  }

  // --- Serve from cache if fresh ---
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.payload, { status: 200 });
  }

  // --- Check for API key ---
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      emptyPayload(symbol, interval, "ALPHA_VANTAGE_API_KEY not configured"),
      { status: 200 }
    );
  }

  // --- Fetch fresh data ---
  try {
    const payload = await fetchIntraday(symbol, interval, apiKey);

    cache.set(cacheKey, {
      expiresAt: now + CACHE_TTL_SECONDS * 1000,
      payload,
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown network error";
    return NextResponse.json(emptyPayload(symbol, interval, message), {
      status: 200,
    });
  }
}

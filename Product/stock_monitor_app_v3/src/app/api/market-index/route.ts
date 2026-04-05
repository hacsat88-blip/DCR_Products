import { NextRequest, NextResponse } from "next/server";

const YAHOO_CHART_ENDPOINT = "https://query1.finance.yahoo.com/v8/finance/chart/%5EN225";
const CACHE_TTL_SECONDS = 300;

const VALID_RANGES = ["1d", "5d", "1mo", "3mo", "6mo", "1y"] as const;
type Range = (typeof VALID_RANGES)[number];

const VALID_INTERVALS = ["5m", "15m", "1h", "1d", "1wk"] as const;

function rangeToInterval(range: Range): string {
  switch (range) {
    case "1d":
      return "5m";
    case "1y":
      return "1wk";
    default:
      return "1d";
  }
}

type NikkeiHistoryPoint = {
  date: string;
  close: number;
};

type NikkeiPayload = {
  latestClose: number | null;
  prevClose: number | null;
  diff: number | null;
  diffPercent: number | null;
  asOf: string | null;
  source: string;
  history: NikkeiHistoryPoint[];
};

type OhlcPoint = {
  date: string;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type OhlcPayload = {
  latestClose: number | null;
  prevClose: number | null;
  diff: number | null;
  diffPercent: number | null;
  asOf: string | null;
  source: string;
  ohlc: OhlcPoint[];
};

const cache = new Map<string, { expiresAt: number; payload: NikkeiPayload | OhlcPayload }>();

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickLastTwo(values: unknown): { latest: number | null; previous: number | null } {
  if (!Array.isArray(values)) {
    return { latest: null, previous: null };
  }
  const valid = values.map((value) => toNumber(value)).filter((value): value is number => value !== null);
  if (valid.length === 0) {
    return { latest: null, previous: null };
  }
  if (valid.length === 1) {
    return { latest: valid[0], previous: null };
  }
  return {
    latest: valid[valid.length - 1],
    previous: valid[valid.length - 2]
  };
}

function toIso(value: unknown): string | null {
  const raw = toNumber(value);
  if (raw === null) {
    return null;
  }
  const ms = raw > 1_000_000_000_000 ? raw : raw * 1000;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function fetchNikkeiDaily(range: Range, interval: string): Promise<NikkeiPayload> {
  const url = new URL(YAHOO_CHART_ENDPOINT);
  url.searchParams.set("interval", interval);
  url.searchParams.set("range", range);

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Nikkei request failed: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    chart?: {
      result?: Array<{
        meta?: Record<string, unknown>;
        timestamp?: unknown[];
        indicators?: { quote?: Array<{ close?: unknown[] }> };
      }>;
    };
  };

  const result = payload.chart?.result?.[0];
  if (!result) {
    throw new Error("Nikkei payload is empty");
  }

  const meta = result.meta ?? {};
  const closesArray = result.indicators?.quote?.[0]?.close;
  const closes = pickLastTwo(closesArray);
  const latestClose = closes.latest ?? toNumber(meta.regularMarketPrice);
  const prevClose = closes.previous ?? toNumber(meta.previousClose);
  const diff =
    latestClose !== null && prevClose !== null && Number.isFinite(latestClose) && Number.isFinite(prevClose)
      ? latestClose - prevClose
      : null;
  const diffPercent =
    diff !== null && prevClose !== null && prevClose !== 0 ? (diff / prevClose) * 100 : null;
  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
  const latestTs = timestamps.length > 0 ? timestamps[timestamps.length - 1] : meta.regularMarketTime;

  const history: NikkeiHistoryPoint[] = [];
  const rawCloses = Array.isArray(closesArray) ? closesArray : [];
  for (let i = 0; i < timestamps.length && i < rawCloses.length; i++) {
    const ts = toIso(timestamps[i]);
    const c = toNumber(rawCloses[i]);
    if (ts !== null && c !== null) {
      history.push({ date: ts.slice(0, 10), close: c });
    }
  }

  return {
    latestClose,
    prevClose,
    diff,
    diffPercent,
    asOf: toIso(latestTs),
    source: "Yahoo Finance ^N225",
    history
  };
}

async function fetchNikkeiOhlc(range: Range, interval: string): Promise<OhlcPayload> {
  const url = new URL(YAHOO_CHART_ENDPOINT);
  url.searchParams.set("interval", interval);
  url.searchParams.set("range", range);

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Nikkei request failed: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    chart?: {
      result?: Array<{
        meta?: Record<string, unknown>;
        timestamp?: unknown[];
        indicators?: {
          quote?: Array<{
            open?: unknown[];
            high?: unknown[];
            low?: unknown[];
            close?: unknown[];
            volume?: unknown[];
          }>;
        };
      }>;
    };
  };

  const result = payload.chart?.result?.[0];
  if (!result) {
    throw new Error("Nikkei payload is empty");
  }

  const meta = result.meta ?? {};
  const quote = result.indicators?.quote?.[0];
  const closesArray = quote?.close;
  const closes = pickLastTwo(closesArray);
  const latestClose = closes.latest ?? toNumber(meta.regularMarketPrice);
  const prevClose = closes.previous ?? toNumber(meta.previousClose);
  const diff =
    latestClose !== null && prevClose !== null && Number.isFinite(latestClose) && Number.isFinite(prevClose)
      ? latestClose - prevClose
      : null;
  const diffPercent =
    diff !== null && prevClose !== null && prevClose !== 0 ? (diff / prevClose) * 100 : null;
  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
  const latestTs = timestamps.length > 0 ? timestamps[timestamps.length - 1] : meta.regularMarketTime;

  const opens = Array.isArray(quote?.open) ? quote.open : [];
  const highs = Array.isArray(quote?.high) ? quote.high : [];
  const lows = Array.isArray(quote?.low) ? quote.low : [];
  const rawCloses = Array.isArray(closesArray) ? closesArray : [];
  const volumes = Array.isArray(quote?.volume) ? quote.volume : [];

  const ohlc: OhlcPoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const ts = toNumber(timestamps[i]);
    const o = toNumber(opens[i]);
    const h = toNumber(highs[i]);
    const l = toNumber(lows[i]);
    const c = toNumber(rawCloses[i]);
    const v = toNumber(volumes[i]);
    if (ts !== null && o !== null && h !== null && l !== null && c !== null) {
      const iso = toIso(timestamps[i]);
      ohlc.push({
        date: iso ?? "",
        time: ts,
        open: o,
        high: h,
        low: l,
        close: c,
        volume: v ?? 0,
      });
    }
  }

  return {
    latestClose,
    prevClose,
    diff,
    diffPercent,
    asOf: toIso(latestTs),
    source: "Yahoo Finance ^N225",
    ohlc,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const key = request.nextUrl.searchParams.get("index")?.trim().toLowerCase() ?? "nikkei";
  if (key !== "nikkei") {
    return NextResponse.json({ error: "Unsupported index" }, { status: 400 });
  }

  const rawRange = request.nextUrl.searchParams.get("range")?.trim().toLowerCase() ?? "5d";
  const range: Range = (VALID_RANGES as readonly string[]).includes(rawRange)
    ? (rawRange as Range)
    : "5d";

  const format = request.nextUrl.searchParams.get("format")?.trim().toLowerCase() ?? "";
  const isOhlc = format === "ohlc";

  const rawInterval = request.nextUrl.searchParams.get("interval")?.trim().toLowerCase() ?? "";
  const interval: string = (VALID_INTERVALS as readonly string[]).includes(rawInterval)
    ? rawInterval
    : rangeToInterval(range);

  const cacheKey = `${key}-${range}-${interval}-${isOhlc ? "ohlc" : "close"}`;

  const now = Date.now();
  for (const [ck, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(ck);
    }
  }

  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.payload, { status: 200 });
  }

  try {
    const payload = isOhlc
      ? await fetchNikkeiOhlc(range, interval)
      : await fetchNikkeiDaily(range, interval);
    cache.set(cacheKey, {
      expiresAt: now + CACHE_TTL_SECONDS * 1000,
      payload
    });
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const base = {
      latestClose: null,
      prevClose: null,
      diff: null,
      diffPercent: null,
      asOf: null,
      source: "Nikkei fetch failed",
      error: error instanceof Error ? error.message : "Unknown error"
    };
    return NextResponse.json(
      isOhlc ? { ...base, ohlc: [] } : { ...base, history: [] },
      { status: 200 }
    );
  }
}

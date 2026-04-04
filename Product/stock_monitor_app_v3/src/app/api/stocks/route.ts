import { NextRequest, NextResponse } from "next/server";

import { MockProvider } from "@/services/providers/mockProvider";
import { loadStocksWithProviders } from "@/services/providers/compositeProvider";
import { DEFAULT_STOCK_CODES, StockFetchResult } from "@/services/providers/types";

const CODE_PATTERN = /^\d{4}$/;
const MAX_CODES = 30;
const CACHE_MIN_SECONDS = 60;
const CACHE_MAX_SECONDS = 300;
const CACHE_DEFAULT_SECONDS = 120;
const rawTtl = Number(process.env.STOCKS_CACHE_TTL_SECONDS ?? String(CACHE_DEFAULT_SECONDS));
const safeTtl = Number.isFinite(rawTtl) ? rawTtl : CACHE_DEFAULT_SECONDS;
const CACHE_TTL_SECONDS = Math.min(
  CACHE_MAX_SECONDS,
  Math.max(CACHE_MIN_SECONDS, Math.floor(safeTtl))
);

const routeCache = new Map<string, { expiresAt: number; payload: StockFetchResult }>();

function normalizeCodes(codes: string[]): string[] {
  const uniq = new Set<string>();
  for (const code of codes) {
    if (CODE_PATTERN.test(code)) {
      uniq.add(code);
    }
    if (uniq.size >= MAX_CODES) {
      break;
    }
  }

  const normalized = [...uniq].sort((a, b) => a.localeCompare(b));
  return normalized.length > 0 ? normalized : [...DEFAULT_STOCK_CODES];
}

function parseCodes(request: NextRequest): string[] {
  const raw = request.nextUrl.searchParams.get("codes");
  if (!raw) {
    return normalizeCodes([...DEFAULT_STOCK_CODES]);
  }
  const parsed = raw
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);

  return normalizeCodes(parsed);
}

function buildCacheKey(codes: string[]): string {
  return codes.join(",");
}

function shouldSkipCacheForAuthFailure(payload: StockFetchResult): boolean {
  return payload.health.some((h) => h.errorCode === "auth_failure");
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const codes = parseCodes(request);
  const cacheKey = buildCacheKey(codes);
  const now = Date.now();

  for (const [key, entry] of routeCache.entries()) {
    if (entry.expiresAt <= now) {
      routeCache.delete(key);
    }
  }

  const cached = routeCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.payload, { status: 200 });
  }

  try {
    const result = await loadStocksWithProviders(codes);
    if (!shouldSkipCacheForAuthFailure(result)) {
      routeCache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000,
        payload: result
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load stock data.";
    const mockProvider = new MockProvider();
    const fallbackStocks = await mockProvider.getStocks(codes);
    const fetchedAt = new Date().toISOString();
    return NextResponse.json(
      {
        stocks: fallbackStocks,
        dataMode: "mock",
        lastUpdatedAt: fetchedAt,
        error: message,
        fallbackReason: "API取得に失敗したため mock データを表示しています。",
        health: [
          {
            provider: "jquants",
            ok: false,
            message: "route fallback",
            errorCode: "network",
            latencyMs: null,
            fetchedAt,
            sourceTimestamp: null,
            sourceLabel: null
          },
          {
            provider: "edinetDb",
            ok: false,
            message: "route fallback",
            errorCode: "network",
            latencyMs: null,
            fetchedAt,
            sourceTimestamp: null,
            sourceLabel: null
          }
        ]
      },
      { status: 200 }
    );
  }
}

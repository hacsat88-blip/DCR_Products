import { z } from "zod";
import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { getDb } from "@/lib/db/client";
import {
  listPortfolio,
  upsertPortfolio,
  removePortfolio,
} from "@/lib/db/repositories/portfolioRepo";
import { portfolioSnapshot, type Portfolio } from "@/lib/db/schema";
import {
  createAlphaVantageClient,
  type AlphaVantageClient,
} from "@/lib/providers/alphaVantage";
import {
  createJQuantsClient,
  type JQuantsClient,
} from "@/lib/providers/jquants";

export const PortfolioInputSchema = z.object({
  id: z.number().int().positive().optional(),
  code: z.string().min(1).max(16),
  market: z.enum(["JP", "US"]),
  name: z.string().min(1).max(120),
  quantity: z.number().nonnegative(),
  avgCost: z.number().nonnegative(),
  currency: z.enum(["JPY", "USD"]),
  note: z.string().max(500).optional().nullable(),
});

export type PortfolioInput = z.infer<typeof PortfolioInputSchema>;

export interface PortfolioWithValue extends Portfolio {
  currentPrice: number | null;
  priceCurrency: "JPY" | "USD";
  fxRate: number;
  marketValueJpy: number;
  costJpy: number;
  pnlJpy: number;
  pnlPercent: number;
  weightPercent: number;
  priceError?: string;
}

export interface PortfolioServiceDeps {
  db?: Database;
  jquants?: JQuantsClient;
  alpha?: AlphaVantageClient;
  now?: () => number;
  fxCacheTtlMs?: number;
}

const DEFAULT_FX_TTL_MS = 5 * 60 * 1000;

const fxCacheStore = new Map<string, { rate: number; expiresAt: number }>();

export function __resetFxCacheForTests(): void {
  fxCacheStore.clear();
}

function resolveDb(deps: PortfolioServiceDeps): Database {
  return deps.db ?? getDb();
}

function resolveJq(deps: PortfolioServiceDeps): JQuantsClient {
  return deps.jquants ?? createJQuantsClient();
}

function resolveAv(deps: PortfolioServiceDeps): AlphaVantageClient {
  return deps.alpha ?? createAlphaVantageClient();
}

function resolveNow(deps: PortfolioServiceDeps): () => number {
  return deps.now ?? Date.now;
}

async function getCachedFxRate(
  alpha: AlphaVantageClient,
  from: "JPY" | "USD",
  to: "JPY" | "USD",
  now: () => number,
  ttl: number,
): Promise<number> {
  if (from === to) return 1;
  const key = `${from}->${to}`;
  const cached = fxCacheStore.get(key);
  if (cached && cached.expiresAt > now()) {
    return cached.rate;
  }
  const rate = await alpha.getFxRate(from, to);
  fxCacheStore.set(key, { rate, expiresAt: now() + ttl });
  return rate;
}

function isoDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function offsetDate(ts: number, days: number): string {
  return isoDate(ts + days * 24 * 60 * 60 * 1000);
}

async function fetchPriceForRow(
  row: Portfolio,
  jq: JQuantsClient,
  av: AlphaVantageClient,
  now: () => number,
): Promise<{ price: number | null; error?: string }> {
  try {
    if (row.market === "JP") {
      const to = isoDate(now());
      const from = offsetDate(now(), -10);
      const candles = await jq.getDailyQuotes(row.code, from, to);
      if (candles.length === 0) return { price: null, error: "no data" };
      return { price: candles[candles.length - 1].close };
    }
    const quote = await av.getQuote(row.code);
    return { price: quote.price };
  } catch (e) {
    return {
      price: null,
      error: e instanceof Error ? e.message : "fetch failed",
    };
  }
}

export async function listPortfolioWithValuation(
  deps: PortfolioServiceDeps = {},
): Promise<PortfolioWithValue[]> {
  const db = resolveDb(deps);
  const jq = resolveJq(deps);
  const av = resolveAv(deps);
  const now = resolveNow(deps);
  const ttl = deps.fxCacheTtlMs ?? DEFAULT_FX_TTL_MS;

  const rows = listPortfolio(db);
  if (rows.length === 0) return [];

  const needsUsd = rows.some((r) => r.currency === "USD");
  const usdJpy = needsUsd
    ? await getCachedFxRate(av, "USD", "JPY", now, ttl)
    : 1;

  const enriched = await Promise.all(
    rows.map(async (row) => {
      const { price, error } = await fetchPriceForRow(row, jq, av, now);
      const fxRate = row.currency === "USD" ? usdJpy : 1;
      const priceCurrency = row.currency;
      const costJpy = row.quantity * row.avgCost * fxRate;
      const marketValueJpy = price != null ? row.quantity * price * fxRate : 0;
      const pnlJpy = price != null ? marketValueJpy - costJpy : 0;
      const pnlPercent =
        price != null && costJpy > 0 ? (pnlJpy / costJpy) * 100 : 0;
      return {
        ...row,
        currentPrice: price,
        priceCurrency,
        fxRate,
        marketValueJpy,
        costJpy,
        pnlJpy,
        pnlPercent,
        weightPercent: 0,
        priceError: error,
      } as PortfolioWithValue;
    }),
  );

  const totalValue = enriched.reduce((s, r) => s + r.marketValueJpy, 0);
  if (totalValue > 0) {
    for (const r of enriched) {
      r.weightPercent = (r.marketValueJpy / totalValue) * 100;
    }
  }
  return enriched;
}

export function addOrUpdatePosition(
  input: unknown,
  deps: PortfolioServiceDeps = {},
): Portfolio {
  const parsed = PortfolioInputSchema.parse(input);
  const db = resolveDb(deps);
  return upsertPortfolio(db, {
    id: parsed.id,
    code: parsed.code,
    market: parsed.market,
    name: parsed.name,
    quantity: parsed.quantity,
    avgCost: parsed.avgCost,
    currency: parsed.currency,
    note: parsed.note ?? null,
  });
}

export function removePosition(
  id: number,
  deps: PortfolioServiceDeps = {},
): void {
  const parsed = z.number().int().positive().parse(id);
  removePortfolio(resolveDb(deps), parsed);
}

export interface SnapshotResult {
  date: string;
  totalValueJpy: number;
  pnlJpy: number;
  inserted: boolean;
}

export async function snapshotDailyValuation(
  deps: PortfolioServiceDeps = {},
): Promise<SnapshotResult> {
  const db = resolveDb(deps);
  const now = resolveNow(deps);
  const valuations = await listPortfolioWithValuation(deps);
  const totalValueJpy = valuations.reduce((s, r) => s + r.marketValueJpy, 0);
  const pnlJpy = valuations.reduce((s, r) => s + r.pnlJpy, 0);
  const date = isoDate(now());

  const existing = db
    .select()
    .from(portfolioSnapshot)
    .where(eq(portfolioSnapshot.date, date))
    .get();

  if (existing) {
    db.update(portfolioSnapshot)
      .set({ totalValueJpy, pnlJpy })
      .where(eq(portfolioSnapshot.id, existing.id))
      .run();
    return { date, totalValueJpy, pnlJpy, inserted: false };
  }
  db.insert(portfolioSnapshot)
    .values({ date, totalValueJpy, pnlJpy })
    .run();
  return { date, totalValueJpy, pnlJpy, inserted: true };
}

import type {
  JQuantsClient,
  JQuantsListedItem,
} from "@/lib/providers/jquants";
import type { AlphaVantageClient } from "@/lib/providers/alphaVantage";
import {
  US_ETF_ALLOWLIST,
  isJpEtf,
  jpEtfName,
  normalizeJpCode,
  usEtfName,
} from "./etfList";
import usSymbolListJson from "./usSymbolList.json";

export type Market = "JP" | "US";

export interface Candidate {
  code: string;
  name: string;
  market: Market;
  price: number;
  currency: "JPY" | "USD";
  volume?: number;
  isEtf: boolean;
}

export interface CandidatePoolFilters {
  priceMin: number;
  priceMax: number;
  /** スクリーニング上限 (default 20) */
  limit?: number;
  /** ETF を含めるか (default true) */
  includeEtf?: boolean;
  /** 個別株を含めるか (default true) */
  includeStocks?: boolean;
}

interface UsSymbolEntry {
  symbol: string;
  name: string;
}
const US_INDIVIDUALS: UsSymbolEntry[] = (
  usSymbolListJson as { individuals: UsSymbolEntry[] }
).individuals;

/** US 候補プール (個別株 + ETF) */
export function buildUsSymbolPool(opts?: {
  includeEtf?: boolean;
  includeStocks?: boolean;
}): UsSymbolEntry[] {
  const includeEtf = opts?.includeEtf ?? true;
  const includeStocks = opts?.includeStocks ?? true;
  const out: UsSymbolEntry[] = [];
  if (includeStocks) out.push(...US_INDIVIDUALS);
  if (includeEtf) {
    for (const e of US_ETF_ALLOWLIST) {
      out.push({ symbol: e.code, name: e.name });
    }
  }
  return out;
}

/** ----------------- JP ----------------- */

export interface JpCandidateDeps {
  jquants: Pick<JQuantsClient, "getListedInfo" | "getDailyQuotesByDate">;
  /** 日付 (YYYY-MM-DD)。未指定時は前営業日に近い日。 */
  date?: string;
}

function defaultPriceDate(now: Date = new Date()): string {
  // 直近営業日近似: 土日なら金曜まで戻す。シンプル化のため US/JP 区別なし。
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  const dow = d.getDay();
  if (dow === 0) d.setDate(d.getDate() - 2); // 日 -> 金
  if (dow === 6) d.setDate(d.getDate() - 1); // 土 -> 金
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function fetchJpCandidates(
  deps: JpCandidateDeps,
  filters: CandidatePoolFilters,
): Promise<Candidate[]> {
  const includeEtf = filters.includeEtf ?? true;
  const includeStocks = filters.includeStocks ?? true;
  const limit = filters.limit ?? 20;

  const date = deps.date ?? defaultPriceDate();
  const [listed, quotes] = await Promise.all([
    deps.jquants.getListedInfo(),
    deps.jquants.getDailyQuotesByDate(date),
  ]);

  const nameByCode = new Map<string, JQuantsListedItem>();
  for (const item of listed) {
    nameByCode.set(normalizeJpCode(item.Code), item);
  }

  const out: Candidate[] = [];
  for (const q of quotes) {
    if (q.close == null) continue;
    if (q.close < filters.priceMin || q.close > filters.priceMax) continue;
    const code = normalizeJpCode(q.code);
    const etf = isJpEtf(code);
    if (etf && !includeEtf) continue;
    if (!etf && !includeStocks) continue;

    const info = nameByCode.get(code);
    const name =
      (etf ? jpEtfName(code) : undefined) ??
      info?.CompanyName ??
      info?.CompanyNameEnglish ??
      code;

    out.push({
      code,
      name,
      market: "JP",
      price: q.close,
      currency: "JPY",
      volume: q.volume ?? undefined,
      isEtf: etf,
    });
  }

  // 出来高上位順
  out.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
  return out.slice(0, limit);
}

/** ----------------- US ----------------- */

export interface UsCandidateDeps {
  alphaVantage: Pick<AlphaVantageClient, "getQuote">;
  /** 同時並列度 (default 2) */
  concurrency?: number;
  /** 1 回のスクリーニングで叩く最大シンボル数 (default 30) */
  maxSymbols?: number;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R | null>,
): Promise<R[]> {
  const results: R[] = [];
  let i = 0;
  async function pump(): Promise<void> {
    while (i < items.length) {
      const idx = i++;
      try {
        const r = await worker(items[idx]);
        if (r != null) results.push(r);
      } catch {
        // ignore individual symbol failure (rate limit, etc.)
      }
    }
  }
  const runners: Promise<void>[] = [];
  const c = Math.max(1, Math.min(concurrency, items.length));
  for (let k = 0; k < c; k++) runners.push(pump());
  await Promise.all(runners);
  return results;
}

export async function fetchUsCandidates(
  deps: UsCandidateDeps,
  filters: CandidatePoolFilters,
): Promise<Candidate[]> {
  const includeEtf = filters.includeEtf ?? true;
  const includeStocks = filters.includeStocks ?? true;
  const limit = filters.limit ?? 20;
  const concurrency = deps.concurrency ?? 2;
  const maxSymbols = deps.maxSymbols ?? 30;

  const pool = buildUsSymbolPool({ includeEtf, includeStocks }).slice(
    0,
    maxSymbols,
  );

  const fetched = await mapWithConcurrency(pool, concurrency, async (entry) => {
    const q = await deps.alphaVantage.getQuote(entry.symbol);
    if (!Number.isFinite(q.price)) return null;
    if (q.price < filters.priceMin || q.price > filters.priceMax) return null;
    const etf = US_ETF_ALLOWLIST.some(
      (e) => e.code === entry.symbol.toUpperCase(),
    );
    return {
      code: entry.symbol,
      name: (etf ? usEtfName(entry.symbol) : undefined) ?? entry.name,
      market: "US" as const,
      price: q.price,
      currency: "USD" as const,
      volume: undefined,
      isEtf: etf,
    } satisfies Candidate;
  });

  return fetched.slice(0, limit);
}

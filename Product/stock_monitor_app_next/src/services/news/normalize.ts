import type { NewsItem } from "./types";

const TICKER_STOP_LIST = new Set<string>([
  "THE",
  "AND",
  "FOR",
  "CEO",
  "CFO",
  "CTO",
  "COO",
  "GDP",
  "CPI",
  "PPI",
  "FED",
  "ETF",
  "IPO",
  "SEC",
  "FOMC",
  "IMF",
  "ESG",
  "LLC",
  "INC",
  "USD",
  "EUR",
  "JPY",
  "API",
  "OPEC",
  "NYSE",
  "WTO",
  "NEWS",
  "WITH",
  "FROM",
  "THAT",
  "HAVE",
]);

const JP_CODE_RE = /(?<![A-Z0-9])\d{4,5}(?![A-Z0-9])/g;
const US_TICKER_RE = /\b[A-Z]{2,5}\b/g;

export function detectSymbols(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();

  const jpMatches = text.match(JP_CODE_RE);
  if (jpMatches) {
    for (const m of jpMatches) found.add(m);
  }

  const usMatches = text.match(US_TICKER_RE);
  if (usMatches) {
    for (const m of usMatches) {
      if (!TICKER_STOP_LIST.has(m)) found.add(m);
    }
  }

  return Array.from(found);
}

export function stableId(url: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < url.length; i += 1) {
    hash ^= url.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function scoreRelevance(item: NewsItem, symbols: string[]): number {
  const matchCount = symbols.filter((s) => item.symbols.includes(s)).length;
  const matchScore = matchCount * 10;

  const publishedMs = Date.parse(item.publishedAt);
  let freshnessScore = 0;
  if (Number.isFinite(publishedMs)) {
    const ageHours = Math.max(0, (Date.now() - publishedMs) / 3_600_000);
    if (ageHours <= 72) {
      freshnessScore = 5 * (1 - ageHours / 72);
    }
  }

  return matchScore + freshnessScore;
}

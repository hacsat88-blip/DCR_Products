import { stockCatalog, type StockCatalogEntry } from "@/data/stockCatalog";
import type { StockSearchOptions, StockSearchResponse, StockSearchResult } from "@/types/search";

const SEARCH_MIN_QUERY_LENGTH = 2;
const SEARCH_LIMIT = 12;

export type ArtifactClaudeSearchFn = (
  query: string,
  catalog: StockCatalogEntry[],
  options: { limit: number; registeredCodes: string[] },
) => Promise<StockSearchResult[]>;

type SearchGlobal = typeof globalThis & {
  __STOCK_MONITOR_CLAUDE_SEARCH__?: ArtifactClaudeSearchFn;
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function scoreEntry(entry: StockCatalogEntry, query: string, tokens: string[]): number {
  const normalizedCode = entry.code.toLowerCase();
  const normalizedName = entry.name.toLowerCase();
  const normalizedSector = (entry.sector ?? "").toLowerCase();
  const normalizedTags = entry.tags.map((tag) => tag.toLowerCase());
  const normalizedSummary = `${entry.oneLiner} ${entry.summary}`.toLowerCase();

  let score = 0;
  if (normalizedCode === query) score += 120;
  if (normalizedCode.startsWith(query)) score += 90;
  if (normalizedName === query) score += 100;
  if (normalizedName.startsWith(query)) score += 70;
  if (normalizedName.includes(query)) score += 50;
  if (normalizedSector.includes(query)) score += 25;
  if (normalizedTags.some((tag) => tag.includes(query))) score += 30;
  if (normalizedSummary.includes(query)) score += 20;

  for (const token of tokens) {
    if (!token) continue;
    if (normalizedName.includes(token)) score += 14;
    if (normalizedSector.includes(token)) score += 8;
    if (normalizedTags.some((tag) => tag.includes(token))) score += 10;
    if (normalizedSummary.includes(token)) score += 6;
  }

  return score;
}

function toSearchResult(
  entry: StockCatalogEntry,
  source: StockSearchResult["source"],
  registeredCodes: Set<string>,
): StockSearchResult {
  return {
    code: entry.code,
    name: entry.name,
    source: registeredCodes.has(entry.code) ? "registered" : source,
    isRegistered: registeredCodes.has(entry.code),
    sector: entry.sector,
    oneLiner: entry.oneLiner,
    summary: entry.summary,
  };
}

function searchCatalog(query: string, registeredCodes: Set<string>, limit: number): StockSearchResult[] {
  const normalizedQuery = normalizeText(query);
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  return stockCatalog
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, normalizedQuery, tokens),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.code.localeCompare(b.entry.code))
    .slice(0, limit)
    .map((item) => toSearchResult(item.entry, "catalog", registeredCodes));
}

function normalizeClaudeResults(results: StockSearchResult[], registeredCodes: Set<string>, limit: number): StockSearchResult[] {
  const merged = new Map<string, StockSearchResult>();
  for (const result of results) {
    if (!/^\d{4}$/.test(result.code)) {
      continue;
    }
    merged.set(result.code, {
      ...result,
      source: registeredCodes.has(result.code) ? "registered" : "claude",
      isRegistered: registeredCodes.has(result.code),
    });
    if (merged.size >= limit) {
      break;
    }
  }
  return [...merged.values()];
}

function getClaudeSearchRunner(): ArtifactClaudeSearchFn | null {
  const candidate = (globalThis as SearchGlobal).__STOCK_MONITOR_CLAUDE_SEARCH__;
  return typeof candidate === "function" ? candidate : null;
}

export async function searchStocksWithClaudeFallback(
  query: string,
  options: StockSearchOptions = {},
): Promise<StockSearchResponse> {
  const normalizedQuery = query.trim();
  const limit = options.limit ?? SEARCH_LIMIT;
  const registeredCodes = new Set(Array.from(options.registeredCodes ?? []));

  if (normalizedQuery.length < SEARCH_MIN_QUERY_LENGTH) {
    return {
      results: [],
      error: `検索文字数は${SEARCH_MIN_QUERY_LENGTH}文字以上で入力してください。`,
    };
  }

  const claudeRunner = getClaudeSearchRunner();
  if (claudeRunner) {
    try {
      const claudeResults = await claudeRunner(normalizedQuery, stockCatalog, {
        limit,
        registeredCodes: [...registeredCodes],
      });
      const normalizedResults = normalizeClaudeResults(
        Array.isArray(claudeResults) ? claudeResults : [],
        registeredCodes,
        limit,
      );

      // If Claude returns no usable candidates, fall back to deterministic catalog search.
      if (normalizedResults.length === 0) {
        return {
          results: searchCatalog(normalizedQuery, registeredCodes, limit),
          error: null,
        };
      }

      return {
        results: normalizedResults,
        error: null,
      };
    } catch (error) {
      const fallbackError =
        error instanceof Error
          ? error.message
          : typeof error === "string" && error.trim().length > 0
            ? error
            : "Claude検索に失敗したためローカル検索へ切り替えました。";
      return {
        results: searchCatalog(normalizedQuery, registeredCodes, limit),
        error: fallbackError,
      };
    }
  }

  return {
    results: searchCatalog(normalizedQuery, registeredCodes, limit),
    error: null,
  };
}

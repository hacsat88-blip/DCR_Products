import { NextRequest, NextResponse } from "next/server";

import { mockStocks } from "@/data/mockStocks";
import { DEFAULT_STOCK_CODES } from "@/services/providers/types";

const DEFAULT_EDINET_BASE_URL = "https://edinetdb.jp/v1";
const SEARCH_MIN_QUERY_LENGTH = 2;
const SEARCH_LIMIT = 12;

interface SearchResultItem {
  code: string;
  name: string;
  source: "registered" | "edinet";
  isRegistered: boolean;
}

type LooseRecord = Record<string, unknown>;

function normalizeSecCode(value: string): string {
  const raw = value.trim();
  return raw.endsWith("0") && raw.length === 5 ? raw.slice(0, 4) : raw;
}

function firstString(row: LooseRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function extractRows(payload: unknown): LooseRecord[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const root = payload as LooseRecord;
  const candidates = [root.data, root.items, payload];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((row): row is LooseRecord => typeof row === "object" && row !== null);
    }
    if (candidate && typeof candidate === "object") {
      const nested = candidate as LooseRecord;
      for (const key of ["data", "items", "results"]) {
        if (Array.isArray(nested[key])) {
          return (nested[key] as unknown[]).filter(
            (row): row is LooseRecord => typeof row === "object" && row !== null
          );
        }
      }
    }
  }
  return [];
}

function dedupeResults(rows: SearchResultItem[]): SearchResultItem[] {
  const map = new Map<string, SearchResultItem>();
  for (const row of rows) {
    const existing = map.get(row.code);
    if (!existing) {
      map.set(row.code, row);
      continue;
    }
    if (!existing.isRegistered && row.isRegistered) {
      map.set(row.code, row);
    }
  }
  return [...map.values()].slice(0, SEARCH_LIMIT);
}

function registeredSearch(query: string): SearchResultItem[] {
  const q = query.toLowerCase();
  return mockStocks
    .filter((stock) => {
      const searchable = [stock.code, stock.name, stock.oneLiner, stock.summary, stock.themeTags.join(" ")]
        .join(" ")
        .toLowerCase();
      return searchable.includes(q);
    })
    .map((stock) => ({
      code: stock.code,
      name: stock.name,
      source: "registered" as const,
      isRegistered: true
    }));
}

async function edinetSearch(query: string): Promise<SearchResultItem[]> {
  const baseUrl = (process.env.EDINET_DB_BASE_URL ?? DEFAULT_EDINET_BASE_URL).replace(/\/$/, "");
  const url = new URL(`${baseUrl}/search`);
  url.searchParams.set("q", query);
  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`EDINET search failed: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  const rows = extractRows(payload);
  const registeredCodes = new Set<string>([...DEFAULT_STOCK_CODES]);

  const mapped = rows
    .map((row) => {
      const secCodeRaw = firstString(row, ["sec_code", "secCode", "securities_code", "code"]);
      const name = firstString(row, ["company_name", "companyName", "name", "filer_name"]);
      if (!secCodeRaw || !name) {
        return null;
      }
      const code = normalizeSecCode(secCodeRaw);
      if (!/^\d{4}$/.test(code)) {
        return null;
      }
      return {
        code,
        name,
        source: "edinet" as const,
        isRegistered: registeredCodes.has(code)
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return dedupeResults(mapped);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < SEARCH_MIN_QUERY_LENGTH) {
    return NextResponse.json({
      results: [],
      error: `検索文字数は${SEARCH_MIN_QUERY_LENGTH}文字以上で入力してください。`
    });
  }

  const localResults = registeredSearch(query);

  try {
    const apiResults = await edinetSearch(query);
    const merged = dedupeResults([...localResults, ...apiResults]);
    return NextResponse.json({
      results: merged,
      error: null
    });
  } catch (error) {
    return NextResponse.json({
      results: localResults,
      error: error instanceof Error ? error.message : "市場検索APIに接続できませんでした。"
    });
  }
}

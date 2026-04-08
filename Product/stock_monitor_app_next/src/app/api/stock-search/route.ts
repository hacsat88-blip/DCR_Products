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
  sector: string | null;
  oneLiner: string;
  summary: string;
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

function cleanText(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

function ensureSentence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (/[。.!！?？]$/.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}。`;
}

function truncateSentence(value: string, maxLength = 64): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return ensureSentence(trimmed);
  }
  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

function buildNarrative(name: string, sector: string | null, detailText: string | null): { oneLiner: string; summary: string } {
  const sectorLabel = sector ?? "未分類";
  const detail = cleanText(detailText);
  if (detail) {
    const detailWithName = detail.includes(name) ? detail : `${name}は${detail}`;
    const summaryPrefix = detail.includes(name) ? detail : `${name}は${sectorLabel}領域で${detail}`;
    return {
      oneLiner: truncateSentence(detailWithName),
      summary: `${ensureSentence(summaryPrefix)} 事業内容と収益源は最新の開示資料で確認してください。`
    };
  }

  return {
    oneLiner: `${name}は${sectorLabel}領域で事業を展開する企業です。`,
    summary: `${name}は${sectorLabel}領域で事業を展開する企業として検索されました。事業内容と収益源は最新の開示資料で確認してください。`
  };
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
      isRegistered: true,
      sector: stock.sector,
      oneLiner: stock.oneLiner,
      summary: stock.summary
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
      const sector = firstString(row, [
        "industry",
        "industry_name",
        "industryName",
        "sector",
        "sector_name",
        "sectorName",
        "business_type",
        "businessType",
        "category"
      ]);
      const detailText = firstString(row, [
        "description",
        "business_description",
        "businessDescription",
        "business_summary",
        "businessSummary",
        "overview",
        "company_overview",
        "companyOverview",
        "profile"
      ]);
      if (!secCodeRaw || !name) {
        return null;
      }
      const code = normalizeSecCode(secCodeRaw);
      if (!/^\d{4}$/.test(code)) {
        return null;
      }
      const narrative = buildNarrative(name, sector, detailText);
      return {
        code,
        name,
        source: "edinet" as const,
        isRegistered: registeredCodes.has(code),
        sector,
        oneLiner: narrative.oneLiner,
        summary: narrative.summary
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

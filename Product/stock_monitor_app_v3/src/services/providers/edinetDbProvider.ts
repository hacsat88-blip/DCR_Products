import { Fundamentals, FundamentalsProvider } from "./types";

const DEFAULT_EDINET_BASE_URL = "https://edinetdb.jp/v1";
const FUNDAMENTALS_CACHE_MIN_SECONDS = 15 * 60;
const FUNDAMENTALS_CACHE_MAX_SECONDS = 24 * 60 * 60;
const FUNDAMENTALS_CACHE_DEFAULT_SECONDS = 60 * 60;
const EDINET_BACKOFF_BASE_DEFAULT_SECONDS = 10 * 60;
const EDINET_BACKOFF_MAX_SECONDS = 2 * 60 * 60;
const EDINET_BACKOFF_MAX_LEVEL = 4;

const STATIC_EDINET_CODE_MAP: Record<string, string> = {
  "9424": "E04473",
  "2337": "E05314",
  "4477": "E35163",
  "4419": "E37145"
};

const moduleCodeCache = new Map<string, string>(Object.entries(STATIC_EDINET_CODE_MAP));
const moduleMissingCache = new Set<string>();
const moduleFundamentalsCache = new Map<string, { expiresAt: number; value: Fundamentals }>();
let moduleBackoffUntilMs = 0;
let moduleBackoffLevel = 0;

type LooseRecord = Record<string, unknown>;

function parseClampedSeconds(raw: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function parseFundamentalsCacheTtlSeconds(): number {
  return parseClampedSeconds(
    process.env.EDINET_FUNDAMENTALS_CACHE_TTL_SECONDS ?? String(FUNDAMENTALS_CACHE_DEFAULT_SECONDS),
    FUNDAMENTALS_CACHE_DEFAULT_SECONDS,
    FUNDAMENTALS_CACHE_MIN_SECONDS,
    FUNDAMENTALS_CACHE_MAX_SECONDS
  );
}

function parseBackoffBaseSeconds(): number {
  return parseClampedSeconds(
    process.env.EDINET_RATE_LIMIT_BACKOFF_BASE_SECONDS ?? String(EDINET_BACKOFF_BASE_DEFAULT_SECONDS),
    EDINET_BACKOFF_BASE_DEFAULT_SECONDS,
    60,
    EDINET_BACKOFF_MAX_SECONDS
  );
}

function cleanupFundamentalsCache(nowMs: number): void {
  for (const [key, entry] of moduleFundamentalsCache.entries()) {
    if (entry.expiresAt <= nowMs) {
      moduleFundamentalsCache.delete(key);
    }
  }
}

function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.includes("HTTP 429") || error.message.toLowerCase().includes("rate limit");
}

function beginBackoff(nowMs: number): void {
  const baseSeconds = parseBackoffBaseSeconds();
  const level = Math.min(moduleBackoffLevel + 1, EDINET_BACKOFF_MAX_LEVEL);
  moduleBackoffLevel = level;
  const delaySeconds = Math.min(baseSeconds * 2 ** (level - 1), EDINET_BACKOFF_MAX_SECONDS);
  moduleBackoffUntilMs = nowMs + delaySeconds * 1000;
}

function clearBackoff(): void {
  moduleBackoffLevel = 0;
  moduleBackoffUntilMs = 0;
}

function backoffMessage(nowMs: number): string {
  if (moduleBackoffUntilMs <= nowMs) {
    return "EDINET backoff active";
  }
  const remainMs = moduleBackoffUntilMs - nowMs;
  const remainMinutes = Math.max(1, Math.ceil(remainMs / (60 * 1000)));
  return `EDINET backoff active (${remainMinutes}分後に再試行)`;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstNumber(row: LooseRecord | null, keys: string[]): number | null {
  if (!row) {
    return null;
  }
  for (const key of keys) {
    if (key in row) {
      const parsed = toNumber(row[key]);
      if (parsed !== null) {
        return parsed;
      }
    }
  }
  return null;
}

function firstString(row: LooseRecord | null, keys: string[]): string | null {
  if (!row) {
    return null;
  }
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function firstStringWithKey(
  row: LooseRecord | null,
  keys: string[]
): { key: string; value: string } | null {
  if (!row) {
    return null;
  }
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return { key, value: value.trim() };
    }
  }
  return null;
}

function extractRows(payload: unknown): LooseRecord[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const root = payload as LooseRecord;
  const candidates = [root.data, root.financials, root.items, payload];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((row): row is LooseRecord => Boolean(row) && typeof row === "object");
    }
    if (candidate && typeof candidate === "object") {
      const nested = candidate as LooseRecord;
      for (const key of ["financials", "items", "results", "data"]) {
        if (Array.isArray(nested[key])) {
          return (nested[key] as unknown[]).filter(
            (row): row is LooseRecord => Boolean(row) && typeof row === "object"
          );
        }
      }
    }
  }
  return [];
}

function calcGrowth(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) {
    return null;
  }
  const raw = ((current - previous) / Math.abs(previous)) * 100;
  return Math.round(raw * 100) / 100;
}

function normalizeSecCode(value: string): string {
  return value.endsWith("0") && value.length === 5 ? value.slice(0, 4) : value;
}

export class EdinetDbProvider implements FundamentalsProvider {
  private readonly baseUrl: string;

  constructor(
    private readonly apiKey: string | null,
    baseUrl = process.env.EDINET_DB_BASE_URL ?? DEFAULT_EDINET_BASE_URL
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async resolveEdinetCode(secCode: string): Promise<string | null> {
    const normalized = normalizeSecCode(secCode);

    if (moduleCodeCache.has(normalized)) {
      return moduleCodeCache.get(normalized) ?? null;
    }

    if (moduleMissingCache.has(normalized)) {
      return null;
    }

    const url = new URL(`${this.baseUrl}/search`);
    url.searchParams.set("q", normalized);

    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`EDINET search failed: HTTP ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    const rows = extractRows(payload);
    const matched = rows.find((row) => {
      const rawCode = firstString(row, ["sec_code", "secCode", "securities_code", "code"]);
      if (!rawCode) {
        return false;
      }
      return normalizeSecCode(rawCode) === normalized;
    });

    const edinetCode = firstString(matched ?? null, ["edinet_code", "edinetCode"]);
    if (edinetCode) {
      moduleCodeCache.set(normalized, edinetCode);
      return edinetCode;
    }

    moduleMissingCache.add(normalized);
    return null;
  }

  private async fetchFinancialRows(edinetCode: string): Promise<LooseRecord[]> {
    const url = new URL(`${this.baseUrl}/companies/${edinetCode}/financials`);
    url.searchParams.set("years", "2");

    const headers: HeadersInit = {};
    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url.toString(), { headers, cache: "no-store" });
    if (!response.ok) {
      throw new Error(`EDINET financials failed: HTTP ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    return extractRows(payload);
  }

  async getFundamentals(codes: string[]): Promise<Fundamentals[]> {
    if (!this.apiKey) {
      throw new Error("EDINET_DB_API_KEY is not set.");
    }

    const nowMs = Date.now();
    cleanupFundamentalsCache(nowMs);
    const ttlSeconds = parseFundamentalsCacheTtlSeconds();
    const fundamentals: Fundamentals[] = [];
    const errors: string[] = [];
    const pendingCodes: string[] = [];
    const unresolvedCodes: string[] = [];

    for (const code of codes) {
      const cached = moduleFundamentalsCache.get(code);
      if (cached && cached.expiresAt > nowMs) {
        fundamentals.push(cached.value);
      } else {
        pendingCodes.push(code);
      }
    }

    if (pendingCodes.length === 0) {
      return fundamentals;
    }

    const backoffActive = moduleBackoffUntilMs > nowMs;
    if (backoffActive) {
      const reason = backoffMessage(nowMs);
      for (const code of pendingCodes) {
        errors.push(`${code}: ${reason}`);
      }
      if (fundamentals.length > 0) {
        return fundamentals;
      }
      throw new Error(`EDINET DB fundamentals failed for all symbols. ${errors.join(" | ")}`.trim());
    }

    let rateLimitTriggered = false;

    for (const code of pendingCodes) {
      try {
        const edinetCode = await this.resolveEdinetCode(code);
        if (!edinetCode) {
          console.warn(`[EDINET] Code resolution failed for ${code} — skipping fundamentals`);
          unresolvedCodes.push(code);
          continue;
        }

        const rows = await this.fetchFinancialRows(edinetCode);
        if (rows.length === 0) {
          continue;
        }

        const latest = rows[0] ?? null;
        const previous = rows[1] ?? null;

        const revenue = firstNumber(latest, ["revenue", "net_sales", "sales"]);
        const revenuePrev = firstNumber(previous, ["revenue", "net_sales", "sales"]);
        const opIncome = firstNumber(latest, ["operating_income", "operating_profit", "op_income"]);
        const opIncomePrev = firstNumber(previous, ["operating_income", "operating_profit", "op_income"]);
        const sourceInfo = firstStringWithKey(latest, [
          "submit_date",
          "submitted_at",
          "period_end",
          "fiscal_year_end",
          "fiscal_year",
          "date"
        ]);

        const built: Fundamentals = {
          code,
          revenueGrowth:
            firstNumber(latest, ["revenue_growth", "revenue_growth_yoy"]) ??
            calcGrowth(revenue, revenuePrev),
          opGrowth:
            firstNumber(latest, ["operating_income_growth", "op_growth", "op_growth_yoy"]) ??
            calcGrowth(opIncome, opIncomePrev),
          operatingCF: firstNumber(latest, [
            "operating_cf",
            "cash_flow_from_operations",
            "net_cash_from_operating_activities"
          ]),
          sourceTimestamp: sourceInfo?.value ?? null,
          sourceLabel: sourceInfo?.key ?? null,
          marketCap: firstNumber(latest, ["market_cap", "marketCapitalization"]),
          per: firstNumber(latest, ["per", "pe"]),
          pbr: firstNumber(latest, ["pbr"]),
          dividendYield: firstNumber(latest, ["dividend_yield"]),
          sector: firstString(latest, ["sector", "industry"])
        };

        fundamentals.push(built);
        moduleFundamentalsCache.set(code, {
          expiresAt: Date.now() + ttlSeconds * 1000,
          value: built
        });
      } catch (error) {
        if (isRateLimitError(error)) {
          rateLimitTriggered = true;
          const catchNowMs = Date.now();
          beginBackoff(catchNowMs);
          const reason = backoffMessage(catchNowMs);
          errors.push(`${code}: ${reason}`);
          break;
        }
        errors.push(`${code}: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }

    if (fundamentals.length > 0 && !rateLimitTriggered) {
      clearBackoff();
    }

    if (unresolvedCodes.length > 0) {
      errors.push(`code resolution failed: ${unresolvedCodes.join(", ")}`);
    }

    if (fundamentals.length === 0) {
      throw new Error(`EDINET DB fundamentals failed for all symbols. ${errors.join(" | ")}`.trim());
    }

    return fundamentals;
  }
}

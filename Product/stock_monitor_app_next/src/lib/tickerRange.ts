// ────────────────────────────────────────────────
// Ticker Range Utilities
// ────────────────────────────────────────────────
//
// Shared helpers for the banded search input. JP stocks use a numeric
// 4–5 digit code window (0000–99999). US tickers are matched by length
// band (2–5 chars) AND an alphabetic window (e.g. "AA"..."ZZZ"), which
// is how the user spec's "00-000" translates to the US symbology.

export interface JpCodeRange {
  start: number; // inclusive
  end: number; // inclusive
}

export interface UsTickerRange {
  minLength: number; // inclusive, 1..6
  maxLength: number; // inclusive, 1..6
  alphaStart: string; // e.g. "A" or "AA"
  alphaEnd: string; // e.g. "Z" or "ZZZ"
  exchanges?: ReadonlyArray<"NYSE" | "NASDAQ" | "AMEX">;
}

export const JP_CODE_MIN = 0;
export const JP_CODE_MAX = 99_999;

export function clampJpCode(value: number): number {
  if (!Number.isFinite(value)) return JP_CODE_MIN;
  return Math.min(JP_CODE_MAX, Math.max(JP_CODE_MIN, Math.trunc(value)));
}

export function normalizeJpRange(range: Partial<JpCodeRange>): JpCodeRange {
  const start = clampJpCode(range.start ?? JP_CODE_MIN);
  const end = clampJpCode(range.end ?? JP_CODE_MAX);
  return start <= end ? { start, end } : { start: end, end: start };
}

export function formatJpCode(code: number): string {
  const n = clampJpCode(code);
  return n.toString().padStart(4, "0");
}

export function parseJpCode(raw: string): number | null {
  const trimmed = raw.replace(/[^\d]/g, "");
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? clampJpCode(n) : null;
}

export function isJpCodeInRange(code: string | number, range: JpCodeRange): boolean {
  const numeric = typeof code === "number" ? code : parseJpCode(code);
  if (numeric === null) return false;
  return numeric >= range.start && numeric <= range.end;
}

// US ticker helpers --------------------------------------------------

const ALPHA_RE = /^[A-Z]+$/;

export function normalizeAlpha(value: string, fallback: string): string {
  const upper = (value ?? "").toUpperCase().replace(/[^A-Z]/g, "");
  return ALPHA_RE.test(upper) ? upper : fallback;
}

/**
 * Lexicographic comparison that treats shorter strings as less-than longer
 * ones when the shared prefix matches (so "AA" < "AAA" < "AB").
 */
export function compareAlpha(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function normalizeUsRange(range: Partial<UsTickerRange>): UsTickerRange {
  const minLength = Math.min(6, Math.max(1, range.minLength ?? 2));
  const maxLengthRaw = Math.min(6, Math.max(minLength, range.maxLength ?? 5));
  const alphaStart = normalizeAlpha(range.alphaStart ?? "A", "A");
  const alphaEnd = normalizeAlpha(range.alphaEnd ?? "Z".repeat(maxLengthRaw), "Z".repeat(maxLengthRaw));
  const start = compareAlpha(alphaStart, alphaEnd) <= 0 ? alphaStart : alphaEnd;
  const end = start === alphaStart ? alphaEnd : alphaStart;
  return {
    minLength,
    maxLength: maxLengthRaw,
    alphaStart: start,
    alphaEnd: end,
    exchanges: range.exchanges,
  };
}

export function isUsTickerInRange(ticker: string, range: UsTickerRange): boolean {
  const symbol = (ticker ?? "").toUpperCase().replace(/[^A-Z.]/g, "");
  if (!symbol) return false;
  // Drop class suffixes like BRK.B for length comparison.
  const core = symbol.split(".")[0];
  if (!ALPHA_RE.test(core)) return false;
  if (core.length < range.minLength || core.length > range.maxLength) return false;
  return compareAlpha(core, range.alphaStart) >= 0 && compareAlpha(core, range.alphaEnd) <= 0;
}

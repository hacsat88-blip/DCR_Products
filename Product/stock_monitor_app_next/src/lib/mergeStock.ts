import type { Fundamentals, Quote } from "@/services/providers/types";
import type { Stock } from "@/types/stock";
import { isSourceLabel, normalizeSourceLabel } from "@/types/source";

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidTimestamp(value: unknown): value is string {
  if (!isValidText(value)) {
    return false;
  }
  return !Number.isNaN(Date.parse(value));
}

function pickNumber(
  ...candidates: Array<number | null | undefined>
): number | null | undefined {
  for (const candidate of candidates) {
    if (isValidNumber(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function pickText(...candidates: Array<string | null | undefined>): string | undefined {
  for (const candidate of candidates) {
    if (isValidText(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function pickTimestamp(...candidates: Array<string | null | undefined>): string | undefined {
  for (const candidate of candidates) {
    if (isValidTimestamp(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function hasLiveFundamentals(fundamental: Fundamentals | undefined): boolean {
  if (!fundamental) {
    return false;
  }
  return Boolean(
    pickNumber(
      fundamental.revenueGrowth,
      fundamental.opGrowth,
      fundamental.operatingCF,
      fundamental.marketCap,
      fundamental.per,
      fundamental.pbr,
      fundamental.dividendYield
    ) !== undefined ||
      pickText(fundamental.sector) !== undefined ||
      pickTimestamp(fundamental.sourceTimestamp) !== undefined
  );
}

function isJpStockCode(code: string): boolean {
  return /^\d{4}$/.test(code);
}

function hasJapaneseCharacters(text: string): boolean {
  return /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text);
}

function isPlaceholderStockName(name: string | undefined, code: string): boolean {
  if (!isValidText(name)) {
    return true;
  }

  const compactName = name.replace(/\s+/g, "").toLowerCase();
  const compactCode = code.trim().toLowerCase();
  return (
    compactName === compactCode ||
    compactName === `銘柄${compactCode}` ||
    compactName === `mock${compactCode}` ||
    compactName === `live${compactCode}` ||
    compactName === `stock${compactCode}`
  );
}

function mergeStockName(stock: Stock, quote: Quote | undefined): string {
  const liveName = pickText(quote?.name);
  if (!isJpStockCode(stock.code)) {
    return liveName ?? stock.name;
  }
  if (isPlaceholderStockName(stock.name, stock.code)) {
    return liveName ?? stock.name;
  }
  if (hasJapaneseCharacters(stock.name)) {
    return stock.name;
  }
  return liveName ?? stock.name;
}

export function mergeStock(stock: Stock, quote: Quote | undefined, fundamental: Fundamentals | undefined): Stock {
  const hasFundamentals = hasLiveFundamentals(fundamental);
  const priceSourceLabel =
    (isSourceLabel(quote?.sourceLabel) ? quote.sourceLabel : undefined) ??
    normalizeSourceLabel(stock.priceSourceLabel, "M");
  const fundamentalsSourceLabel =
    hasFundamentals
      ? normalizeSourceLabel(fundamental?.sourceLabel, "C")
      : normalizeSourceLabel(stock.fundamentalsSourceLabel, "M");

  return {
    ...stock,
    name: mergeStockName(stock, quote),
    price: pickNumber(quote?.price) ?? stock.price,
    changePercent: pickNumber(quote?.changePercent) ?? stock.changePercent,
    sector: pickText(quote?.sector, fundamental?.sector) ?? stock.sector,
    marketCap: pickNumber(quote?.marketCap, fundamental?.marketCap) ?? stock.marketCap,
    per: pickNumber(quote?.per, fundamental?.per) ?? stock.per,
    pbr: pickNumber(quote?.pbr, fundamental?.pbr) ?? stock.pbr,
    dividendYield: pickNumber(quote?.dividendYield, fundamental?.dividendYield) ?? stock.dividendYield,
    revenueGrowth: pickNumber(fundamental?.revenueGrowth) ?? stock.revenueGrowth,
    opGrowth: pickNumber(fundamental?.opGrowth) ?? stock.opGrowth,
    operatingCF: pickNumber(fundamental?.operatingCF) ?? stock.operatingCF,
    priceUpdatedAt: pickTimestamp(quote?.sourceTimestamp, stock.priceUpdatedAt) ?? null,
    priceSourceLabel,
    fundamentalsUpdatedAt: pickTimestamp(fundamental?.sourceTimestamp, stock.fundamentalsUpdatedAt) ?? null,
    fundamentalsSubmitDate: pickTimestamp(fundamental?.sourceTimestamp, stock.fundamentalsSubmitDate) ?? null,
    fundamentalsSourceLabel,
    chartData: stock.chartData
  };
}

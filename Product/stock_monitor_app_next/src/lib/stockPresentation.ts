import { formatMarketCap, formatPercent, formatYen } from "@/lib/format";
import type { EvaluatedStock } from "@/types/stock";

const PLACEHOLDER_STOCK_NAME = /^銘柄\s*\d{4}$/;
export const COMPARE_SELECTION_LIMIT = 4;

function isApiAddedStock(stock: Pick<EvaluatedStock, "id">): boolean {
  return stock.id.startsWith("live-");
}

export function canSelectForCompare(compareSelection: string[], code: string): boolean {
  const normalizedCode = code.trim();
  if (!normalizedCode) {
    return false;
  }
  return compareSelection.includes(normalizedCode) || compareSelection.length < COMPARE_SELECTION_LIMIT;
}

export function addToCompareSelection(compareSelection: string[], code: string): string[] {
  const normalizedCode = code.trim();
  if (!normalizedCode) {
    return compareSelection;
  }
  if (compareSelection.includes(normalizedCode)) {
    return compareSelection;
  }
  if (compareSelection.length >= COMPARE_SELECTION_LIMIT) {
    return compareSelection;
  }
  return [...compareSelection, normalizedCode];
}

export function getCompareSelectionStatus(compareSelection: string[]): {
  count: number;
  limit: number;
  slotsLeft: number;
  isFull: boolean;
} {
  const count = compareSelection.length;
  return {
    count,
    limit: COMPARE_SELECTION_LIMIT,
    slotsLeft: Math.max(0, COMPARE_SELECTION_LIMIT - count),
    isFull: count >= COMPARE_SELECTION_LIMIT
  };
}

export function getStockDisplayName(stock: Pick<EvaluatedStock, "id" | "code" | "name">): string {
  const name = stock.name.trim();
  if (!name) {
    return `銘柄 ${stock.code}`;
  }
  if (isApiAddedStock(stock) && PLACEHOLDER_STOCK_NAME.test(name)) {
    return `${stock.code}（名称取得待ち）`;
  }
  return name;
}

export function getStockOverviewText(stock: Pick<EvaluatedStock, "id" | "oneLiner" | "summary">): string {
  const oneLiner = stock.oneLiner.trim();
  const summary = stock.summary.trim();
  return oneLiner || summary || "情報更新待ち";
}

export function getStockNarrativeSummaryText(stock: Pick<EvaluatedStock, "oneLiner" | "summary">): string {
  const summary = stock.summary.trim();
  const oneLiner = stock.oneLiner.trim();
  return summary || oneLiner || "情報更新待ち";
}

export function getStockInsightText(stock: Pick<EvaluatedStock, "id" | "oneLiner" | "summary">): string {
  return getStockOverviewText(stock);
}

export function getRemoveStockConfirmMessage(stock: Pick<EvaluatedStock, "id" | "code" | "name">): string {
  const displayName = getStockDisplayName(stock);
  return `${displayName}（${stock.code}）を削除しますか？監視・比較・保有数・詳細メモは削除されます。履歴スナップショットは保持されます。`;
}

export function getRemoveStockAriaLabel(stock: Pick<EvaluatedStock, "id" | "code" | "name">): string {
  const displayName = getStockDisplayName(stock);
  return `${displayName}（${stock.code}）を削除`;
}

export function isStockPricePending(stock: Pick<EvaluatedStock, "id" | "price" | "priceSourceLabel">): boolean {
  if (!isApiAddedStock(stock)) {
    return false;
  }
  if (stock.price > 0) {
    return false;
  }
  return stock.priceSourceLabel === null || stock.priceSourceLabel === undefined || stock.priceSourceLabel === "M";
}

export function formatStockPriceDisplay(stock: Pick<EvaluatedStock, "id" | "price" | "priceSourceLabel">): string {
  return isStockPricePending(stock) ? "価格取得待ち" : formatYen(stock.price);
}

export function formatStockChangeDisplay(
  stock: Pick<EvaluatedStock, "id" | "price" | "priceSourceLabel" | "changePercent">
): string {
  return isStockPricePending(stock) ? "-" : formatPercent(stock.changePercent);
}

export function formatStockMarketCapDisplay(
  stock: Pick<EvaluatedStock, "id" | "marketCap" | "fundamentalsSourceLabel">
): string {
  const hasMarketCap = stock.marketCap > 0;
  if (hasMarketCap) {
    return formatMarketCap(stock.marketCap);
  }
  if (isApiAddedStock(stock) && (stock.fundamentalsSourceLabel === null || stock.fundamentalsSourceLabel === "M")) {
    return "時価総額取得待ち";
  }
  return formatMarketCap(stock.marketCap);
}

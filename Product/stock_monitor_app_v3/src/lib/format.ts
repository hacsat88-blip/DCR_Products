import { StockAction } from "@/types/stock";

export function formatYen(value: number): string {
  return `¥${value.toLocaleString("ja-JP")}`;
}

export function formatPercent(value: number | null): string {
  if (value === null) {
    return "-";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatMarketCap(value: number): string {
  const oku = value / 100_000_000;
  return `${Math.round(oku).toLocaleString("ja-JP")}億円`;
}

export function formatActionLabel(action: StockAction): string {
  if (action === "buy_now") return "今買う";
  if (action === "wait_earnings") return "決算待ち";
  if (action === "wait_pullback") return "押し目待ち";
  return "除外";
}

export function actionTone(action: StockAction): "buy" | "wait" | "exclude" {
  if (action === "buy_now") return "buy";
  if (action === "exclude") return "exclude";
  return "wait";
}

export function formatNullableNumber(value: number | null, digits = 1): string {
  return value === null ? "-" : value.toFixed(digits);
}

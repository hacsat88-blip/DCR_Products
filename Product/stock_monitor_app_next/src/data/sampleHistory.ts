import { mockStocks } from "@/data/mockStocks";
import { HistoryDataPoint } from "@/types/backtest";
import { Stock } from "@/types/stock";

const GROWTH_FACTORS = [0.72, 0.76, 0.8, 0.84, 0.88, 0.92, 0.96, 1.0, 1.04, 1.08, 1.12, 1.16];
const OP_FACTORS = [0.68, 0.72, 0.78, 0.82, 0.86, 0.9, 0.95, 1.0, 1.05, 1.1, 1.14, 1.18];
const CF_FACTORS = [0.55, 0.62, 0.7, 0.78, 0.86, 0.92, 0.96, 1.0, 1.05, 1.1, 1.15, 1.2];
const PER_FACTORS = [1.2, 1.16, 1.12, 1.08, 1.04, 1.0, 0.98, 0.96, 0.94, 0.92, 0.9, 0.88];

function scaled(value: number | null, factor: number): number | null {
  if (value === null) {
    return null;
  }
  return Number((value * factor).toFixed(2));
}

function buildHistory(stock: Stock): HistoryDataPoint[] {
  return stock.chartData.map((point, index) => ({
    date: point.date,
    price: point.price,
    benchmark: point.benchmark,
    revenueGrowth: scaled(stock.revenueGrowth, GROWTH_FACTORS[index] ?? 1),
    opGrowth: scaled(stock.opGrowth, OP_FACTORS[index] ?? 1),
    operatingCF: scaled(stock.operatingCF, CF_FACTORS[index] ?? 1),
    per: scaled(stock.per, PER_FACTORS[index] ?? 1),
    pbr: stock.pbr,
    dividendYield: stock.dividendYield,
    hasDilutionRisk: stock.hasDilutionRisk,
    hasOneOffProfitRisk: stock.hasOneOffProfitRisk
  }));
}

export const sampleHistoryData: Record<string, HistoryDataPoint[]> = Object.fromEntries(
  mockStocks.map((stock) => [stock.code, buildHistory(stock)])
);

export function getSampleHistoryForStock(code: string): HistoryDataPoint[] {
  const rows = sampleHistoryData[code];
  return rows ? rows.map((row) => ({ ...row })) : [];
}


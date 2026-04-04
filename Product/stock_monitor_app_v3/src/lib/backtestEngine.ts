import { evaluateStock } from "@/lib/scoring";
import { BacktestPoint, BacktestResult, HistoryDataPoint } from "@/types/backtest";
import { ScoringConfig } from "@/types/scoring";
import { Stock } from "@/types/stock";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function num(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toReturnPct(value: number): number {
  return Number(((value - 1) * 100).toFixed(2));
}

function lastItem<T>(values: T[]): T | undefined {
  return values.length > 0 ? values[values.length - 1] : undefined;
}

function calculateMaxDrawdown(indexSeries: number[]): number | null {
  if (indexSeries.length === 0) {
    return null;
  }
  let peak = indexSeries[0];
  let maxDrawdown = 0;
  for (const value of indexSeries) {
    if (value > peak) {
      peak = value;
    }
    if (peak > 0) {
      const drawdown = (value - peak) / peak;
      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }
  return Number((maxDrawdown * 100).toFixed(2));
}

function filterByRange(rows: HistoryDataPoint[], startDate?: string, endDate?: string): HistoryDataPoint[] {
  const start = startDate ? Date.parse(startDate) : Number.NEGATIVE_INFINITY;
  const end = endDate ? Date.parse(endDate) : Number.POSITIVE_INFINITY;
  return rows.filter((row) => {
    const ts = Date.parse(row.date);
    if (Number.isNaN(ts)) {
      return true;
    }
    return ts >= start && ts <= end;
  });
}

function toSyntheticStock(baseStock: Stock, row: HistoryDataPoint, prevPrice: number | null): Stock {
  const changePercent =
    prevPrice !== null && row.price !== null && prevPrice !== 0
      ? ((row.price - prevPrice) / prevPrice) * 100
      : baseStock.changePercent;

  return {
    ...baseStock,
    price: row.price ?? baseStock.price,
    changePercent,
    revenueGrowth: row.revenueGrowth,
    opGrowth: row.opGrowth,
    operatingCF: row.operatingCF,
    per: row.per,
    pbr: row.pbr,
    dividendYield: row.dividendYield,
    hasDilutionRisk: row.hasDilutionRisk ?? baseStock.hasDilutionRisk,
    hasOneOffProfitRisk: row.hasOneOffProfitRisk ?? baseStock.hasOneOffProfitRisk
  };
}

export function runSingleStockBacktest(params: {
  stock: Stock;
  history: HistoryDataPoint[];
  config: ScoringConfig;
  startDate?: string;
  endDate?: string;
}): BacktestResult {
  const filteredHistory = filterByRange(params.history, params.startDate, params.endDate);
  if (filteredHistory.length === 0) {
    const now = new Date().toISOString();
    return {
      id: createId("bt"),
      stockCode: params.stock.code,
      mode: "single_stock",
      startedAt: now,
      endedAt: now,
      totalReturnPct: null,
      benchmarkReturnPct: null,
      excessReturnPct: null,
      maxDrawdownPct: null,
      actionChanges: 0,
      notes: "履歴データが不足しています。",
      points: []
    };
  }

  let strategy = 1;
  let benchmark = 1;
  let prevAction: string | null = null;
  let prevPrice: number | null = null;
  let prevBenchmark: number | null = null;
  let actionChanges = 0;
  const strategySeries: number[] = [];
  const points: BacktestPoint[] = [];

  for (const row of filteredHistory) {
    const synthetic = toSyntheticStock(params.stock, row, prevPrice);
    const evaluated = evaluateStock(synthetic, params.config);

    if (prevAction !== null && evaluated.evaluatedAction !== prevAction) {
      actionChanges += 1;
    }

    if (prevPrice !== null && row.price !== null && prevPrice > 0 && prevAction === "buy_now") {
      strategy *= row.price / prevPrice;
    }

    if (prevBenchmark !== null && row.benchmark !== null && prevBenchmark > 0) {
      benchmark *= row.benchmark / prevBenchmark;
    }

    strategySeries.push(strategy);
    points.push({
      date: row.date,
      stockCode: params.stock.code,
      price: row.price,
      benchmark: row.benchmark,
      score: num(evaluated.score),
      action: evaluated.evaluatedAction,
      strategyIndex: Number((strategy * 100).toFixed(2)),
      benchmarkIndex: Number((benchmark * 100).toFixed(2))
    });

    prevAction = evaluated.evaluatedAction;
    prevPrice = row.price;
    prevBenchmark = row.benchmark;
  }

  const totalReturnPct = toReturnPct(strategy);
  const benchmarkReturnPct = toReturnPct(benchmark);
  const excessReturnPct = Number((totalReturnPct - benchmarkReturnPct).toFixed(2));
  const maxDrawdownPct = calculateMaxDrawdown(strategySeries);

  return {
    id: createId("bt"),
    stockCode: params.stock.code,
    mode: "single_stock",
    startedAt: points[0]?.date ?? new Date().toISOString(),
    endedAt: lastItem(points)?.date ?? new Date().toISOString(),
    totalReturnPct,
    benchmarkReturnPct,
    excessReturnPct,
    maxDrawdownPct,
    actionChanges,
    notes: "簡易バックテストです。投資成果を保証するものではありません。",
    points
  };
}

export function runWatchlistBacktest(params: {
  stocks: Stock[];
  historyByCode: Record<string, HistoryDataPoint[]>;
  config: ScoringConfig;
  startDate?: string;
  endDate?: string;
}): BacktestResult {
  const targets = params.stocks.filter((stock) => Boolean(stock.watched));
  const stocks = targets.length > 0 ? targets : params.stocks;
  const results = stocks.map((stock) =>
    runSingleStockBacktest({
      stock,
      history: params.historyByCode[stock.code] ?? [],
      config: params.config,
      startDate: params.startDate,
      endDate: params.endDate
    })
  );
  const valid = results.filter((result) => result.points.length > 0);

  if (valid.length === 0) {
    const now = new Date().toISOString();
    return {
      id: createId("bt"),
      mode: "watchlist",
      startedAt: now,
      endedAt: now,
      totalReturnPct: null,
      benchmarkReturnPct: null,
      excessReturnPct: null,
      maxDrawdownPct: null,
      actionChanges: 0,
      notes: "履歴データが不足しています。",
      points: []
    };
  }

  const template = valid[0].points;
  const points: BacktestPoint[] = template.map((point, index) => {
    const strategyValues = valid
      .map((result) => result.points[index]?.strategyIndex)
      .filter((value): value is number => typeof value === "number");
    const benchmarkValues = valid
      .map((result) => result.points[index]?.benchmarkIndex)
      .filter((value): value is number => typeof value === "number");

    const avgStrategy =
      strategyValues.length > 0
        ? Number(
            (strategyValues.reduce((sum, value) => sum + value, 0) / strategyValues.length).toFixed(2)
          )
        : null;
    const avgBenchmark =
      benchmarkValues.length > 0
        ? Number(
            (benchmarkValues.reduce((sum, value) => sum + value, 0) / benchmarkValues.length).toFixed(2)
          )
        : null;

    return {
      date: point.date,
      stockCode: "WATCHLIST",
      price: null,
      benchmark: null,
      score: null,
      action: null,
      strategyIndex: avgStrategy,
      benchmarkIndex: avgBenchmark
    };
  });

  const lastPoint = lastItem(points);
  const totalReturnPct =
    lastPoint?.strategyIndex !== null && lastPoint?.strategyIndex !== undefined
      ? Number(((lastPoint.strategyIndex / 100 - 1) * 100).toFixed(2))
      : null;
  const benchmarkReturnPct =
    lastPoint?.benchmarkIndex !== null && lastPoint?.benchmarkIndex !== undefined
      ? Number(((lastPoint.benchmarkIndex / 100 - 1) * 100).toFixed(2))
      : null;
  const excessReturnPct =
    totalReturnPct !== null && benchmarkReturnPct !== null
      ? Number((totalReturnPct - benchmarkReturnPct).toFixed(2))
      : null;
  const maxDrawdownPct = calculateMaxDrawdown(
    points
      .map((point) => point.strategyIndex)
      .filter((value): value is number => typeof value === "number")
      .map((value) => value / 100)
  );
  const actionChanges = valid.reduce((sum, result) => sum + result.actionChanges, 0);

  return {
    id: createId("bt"),
    mode: "watchlist",
    startedAt: points[0]?.date ?? new Date().toISOString(),
    endedAt: lastItem(points)?.date ?? new Date().toISOString(),
    totalReturnPct,
    benchmarkReturnPct,
    excessReturnPct,
    maxDrawdownPct,
    actionChanges,
    notes: "簡易バックテストです。投資成果を保証するものではありません。",
    points
  };
}

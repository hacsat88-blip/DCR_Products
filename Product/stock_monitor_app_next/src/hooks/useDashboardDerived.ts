"use client";

import { useMemo, useState, useEffect } from "react";

import { filterStocks, sortStocks } from "@/lib/filters";
import { useSelectedStock, useStockStore } from "@/store/useStockStore";
import { RankingSortKey } from "@/types/archive";
import { BacktestResult } from "@/types/backtest";
import { EvaluatedStock } from "@/types/stock";

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function lastValue<T>(values: T[]): T | undefined {
  return values.length > 0 ? values[values.length - 1] : undefined;
}

function sortForRanking(
  stocks: EvaluatedStock[],
  rankingSortKey: RankingSortKey,
  backtestResults: BacktestResult[]
): EvaluatedStock[] {
  const excessMap = new Map<string, number>();
  for (const result of backtestResults) {
    if (result.stockCode && result.excessReturnPct !== null && !excessMap.has(result.stockCode)) {
      excessMap.set(result.stockCode, result.excessReturnPct);
    }
  }
  const actionPriority: Record<string, number> = {
    buy_now: 0,
    wait_earnings: 1,
    wait_pullback: 2,
    exclude: 3
  };
  const copied = [...stocks];
  copied.sort((a, b) => {
    if (rankingSortKey === "score_desc") return b.score - a.score;
    if (rankingSortKey === "price_asc") return a.price - b.price;
    if (rankingSortKey === "price_desc") return b.price - a.price;
    if (rankingSortKey === "revenue_growth_desc") return (b.revenueGrowth ?? -Infinity) - (a.revenueGrowth ?? -Infinity);
    if (rankingSortKey === "op_growth_desc") return (b.opGrowth ?? -Infinity) - (a.opGrowth ?? -Infinity);
    if (rankingSortKey === "operating_cf_desc") return (b.operatingCF ?? -Infinity) - (a.operatingCF ?? -Infinity);
    if (rankingSortKey === "per_asc") return (a.per ?? Infinity) - (b.per ?? Infinity);
    if (rankingSortKey === "backtest_excess_desc") return (excessMap.get(b.code) ?? -Infinity) - (excessMap.get(a.code) ?? -Infinity);
    return (actionPriority[a.evaluatedAction] ?? 99) - (actionPriority[b.evaluatedAction] ?? 99);
  });
  return copied;
}

export function useDashboardDerived() {
  const stocks = useStockStore((s) => s.stocks);
  const filters = useStockStore((s) => s.filters);
  const sortKey = useStockStore((s) => s.sortKey);
  const rankingSortKey = useStockStore((s) => s.rankingSortKey);
  const selectedStockId = useStockStore((s) => s.selectedStockId);
  const detailOpen = useStockStore((s) => s.detailOpen);
  const lastUpdatedAt = useStockStore((s) => s.lastUpdatedAt);
  const backtestResults = useStockStore((s) => s.backtestResults);
  const hypothesisMap = useStockStore((s) => s.hypothesisMap);

  const selectedStock = useSelectedStock();

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const sectors = useMemo(() => ["all", ...new Set(stocks.map((s) => s.sector))], [stocks]);

  const filteredStocks = useMemo(() => {
    const filtered = filterStocks(stocks, filters);
    return sortStocks(filtered, sortKey);
  }, [stocks, filters, sortKey]);

  const activeStock = useMemo(() => {
    if (filteredStocks.length === 0) return null;
    return filteredStocks.find((s) => s.id === selectedStockId) ?? filteredStocks[0];
  }, [filteredStocks, selectedStockId]);

  const selectedInFiltered = useMemo(() => {
    if (!selectedStock) return false;
    return filteredStocks.some((s) => s.id === selectedStock.id);
  }, [filteredStocks, selectedStock]);

  const drawerStock = detailOpen ? selectedStock : (activeStock ?? selectedStock);
  const selectedIdForGrid = selectedInFiltered ? selectedStock?.id ?? null : activeStock?.id ?? null;

  const managerSeries = useMemo(() => {
    if (stocks.length === 0) return [] as number[];
    const length = Math.max(...stocks.map((s) => s.chartData.length), 0);
    return Array.from({ length }, (_, i) => {
      const eligible = stocks.filter((s) => s.chartData.length > i);
      if (eligible.length === 0) return 100;
      const base = average(eligible.map((s) => s.chartData[0]?.price ?? s.chartData[i].price));
      const current = average(eligible.map((s) => s.chartData[i].price));
      return (current / base) * 100;
    });
  }, [stocks]);

  const benchmarkSeries = useMemo(() => {
    const source = stocks.find((s) => s.chartData.length > 0);
    if (!source) return [] as number[];
    return source.chartData.map((row) => row.benchmark);
  }, [stocks]);

  const benchmarkIndex = lastValue(benchmarkSeries) ?? 100;
  const safeManagerIndex = lastValue(managerSeries) ?? 100;
  const watchCount = stocks.filter((s) => s.watched).length;

  const selectedBacktestResult = useMemo(() => {
    if (!selectedStock) return null;
    return backtestResults.find((r) => r.stockCode === selectedStock.code) ?? null;
  }, [backtestResults, selectedStock]);

  const selectedHypothesis = useMemo(() => {
    if (!selectedStock) return null;
    return hypothesisMap[selectedStock.id] ?? null;
  }, [hypothesisMap, selectedStock]);

  const isStale = useMemo(() => {
    if (!lastUpdatedAt) return false;
    const ts = Date.parse(lastUpdatedAt);
    if (Number.isNaN(ts)) return false;
    return now - ts > 15 * 60 * 1000;
  }, [lastUpdatedAt, now]);

  const rankedRows = useMemo(
    () => sortForRanking(filteredStocks, rankingSortKey, backtestResults),
    [filteredStocks, rankingSortKey, backtestResults]
  );

  return {
    sectors,
    filteredStocks,
    drawerStock,
    selectedIdForGrid,
    selectedStock,
    selectedInFiltered,
    benchmarkIndex,
    safeManagerIndex,
    watchCount,
    managerSeries,
    benchmarkSeries,
    selectedBacktestResult,
    selectedHypothesis,
    isStale,
    rankedRows
  };
}

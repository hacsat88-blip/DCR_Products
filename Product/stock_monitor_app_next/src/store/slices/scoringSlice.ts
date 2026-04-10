"use client";

import { StateCreator } from "zustand";

import { buildAlertConditionBaseline, buildAlertSnapshots } from "@/lib/alertEngine";
import { evaluateStock } from "@/lib/scoring";
import { getSampleHistoryForStock } from "@/data/sampleHistory";
import { runSingleStockBacktest, runWatchlistBacktest } from "@/lib/backtestEngine";
import { BacktestResult, BacktestRunParams, HistoryDataPoint } from "@/types/backtest";
import { ScoringConfig } from "@/types/scoring";

import type { StoreState } from "./types";
import {
  BACKTEST_RESULTS_KEY,
  fallbackHistoryFromStock,
  normalizeBacktestResults,
  DEFAULT_SCORING_CONFIG,
  sanitizeScoringConfig,
  SCORING_CONFIG_KEY
} from "./helpers/backtest";
import {
  ALERT_CONDITION_STATE_KEY,
  ALERT_SNAPSHOTS_KEY,
} from "./helpers/alert";
import { writeJSON } from "./helpers/persistence";

export interface ScoringSlice {
  scoringConfig: ScoringConfig;
  backtestResults: BacktestResult[];
  setScoringConfig: (patch: Partial<ScoringConfig>) => void;
  resetScoringConfig: () => void;
  runBacktest: (params?: BacktestRunParams) => void;
  clearBacktestResults: () => void;
}

export const createScoringSlice: StateCreator<StoreState, [], [], ScoringSlice> = (set, get) => ({
  scoringConfig: DEFAULT_SCORING_CONFIG,
  backtestResults: [],

  setScoringConfig: (patch) => {
    set((state) => {
      const scoringConfig = sanitizeScoringConfig({ ...state.scoringConfig, ...patch });
      const stocks = state.stocks.map((stock) => ({
        ...stock,
        ...evaluateStock(stock, scoringConfig)
      }));
      const checkedAt = state.lastUpdatedAt ?? new Date().toISOString();
      const previousSnapshots = buildAlertSnapshots(stocks, state.dataMode, state.health, checkedAt);
      const alertConditionState = buildAlertConditionBaseline({
        stocks,
        rules: state.alertRules,
        dataMode: state.dataMode,
        health: state.health,
        checkedAt,
        previousSnapshots
      });
      writeJSON(SCORING_CONFIG_KEY, scoringConfig);
      writeJSON(ALERT_SNAPSHOTS_KEY, previousSnapshots);
      writeJSON(ALERT_CONDITION_STATE_KEY, alertConditionState);
      return { scoringConfig, stocks, previousSnapshots, alertConditionState };
    });
  },

  resetScoringConfig: () => {
    set((state) => {
      const scoringConfig = DEFAULT_SCORING_CONFIG;
      const stocks = state.stocks.map((stock) => ({
        ...stock,
        ...evaluateStock(stock, scoringConfig)
      }));
      const checkedAt = state.lastUpdatedAt ?? new Date().toISOString();
      const previousSnapshots = buildAlertSnapshots(stocks, state.dataMode, state.health, checkedAt);
      const alertConditionState = buildAlertConditionBaseline({
        stocks,
        rules: state.alertRules,
        dataMode: state.dataMode,
        health: state.health,
        checkedAt,
        previousSnapshots
      });
      writeJSON(SCORING_CONFIG_KEY, scoringConfig);
      writeJSON(ALERT_SNAPSHOTS_KEY, previousSnapshots);
      writeJSON(ALERT_CONDITION_STATE_KEY, alertConditionState);
      return { scoringConfig, stocks, previousSnapshots, alertConditionState };
    });
  },

  runBacktest: (params) => {
    const state = get();
    if (state.stocks.length === 0) {
      return;
    }

    const mode = params?.mode ?? "single_stock";
    const selectedCode =
      state.stocks.find((stock) => stock.id === state.selectedStockId)?.code ?? state.stocks[0]?.code;
    const targetCode = params?.stockCode ?? selectedCode;

    let result: BacktestResult;

    if (mode === "watchlist") {
      const historyByCode: Record<string, HistoryDataPoint[]> = {};
      for (const stock of state.stocks) {
        const sample = getSampleHistoryForStock(stock.code);
        historyByCode[stock.code] = sample.length > 0 ? sample : fallbackHistoryFromStock(stock);
      }
      result = runWatchlistBacktest({
        stocks: state.stocks,
        historyByCode,
        config: state.scoringConfig,
        startDate: params?.startDate,
        endDate: params?.endDate
      });
    } else {
      const stock = state.stocks.find((item) => item.code === targetCode);
      if (!stock) {
        return;
      }
      const sample = getSampleHistoryForStock(stock.code);
      const history = sample.length > 0 ? sample : fallbackHistoryFromStock(stock);
      result = runSingleStockBacktest({
        stock,
        history,
        config: state.scoringConfig,
        startDate: params?.startDate,
        endDate: params?.endDate
      });
    }

    const backtestResults = normalizeBacktestResults([result, ...state.backtestResults]);
    set({ backtestResults });
    writeJSON(BACKTEST_RESULTS_KEY, backtestResults);
  },

  clearBacktestResults: () => {
    set(() => {
      writeJSON(BACKTEST_RESULTS_KEY, []);
      return { backtestResults: [] };
    });
  }
});

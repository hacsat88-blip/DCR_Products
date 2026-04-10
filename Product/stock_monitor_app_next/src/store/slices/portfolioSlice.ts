"use client";

import { StateCreator } from "zustand";

import { HypothesisLog } from "@/types/stock";

import type { StoreState } from "./types";
import {
  HOLDINGS_KEY,
  HYPOTHESIS_KEY,
  MEMO_KEY,
  WATCH_KEY
} from "./helpers/core";
import { notifyStorageFailure, writeJSON } from "./helpers/persistence";

export interface PortfolioSlice {
  watchMap: Record<string, boolean>;
  holdingsMap: Record<string, number>;
  memoMap: Record<string, string>;
  hypothesisMap: Record<string, HypothesisLog>;
  toggleWatch: (stockId: string) => void;
  saveMemo: (stockId: string, memo: string) => void;
  setHolding: (stockId: string, shares: number) => void;
  adjustHolding: (stockId: string, delta: number) => void;
  clearHoldings: () => void;
  saveHypothesis: (stockId: string, patch: Partial<HypothesisLog>) => void;
}

export const createPortfolioSlice: StateCreator<StoreState, [], [], PortfolioSlice> = (set) => ({
  watchMap: {},
  holdingsMap: {},
  memoMap: {},
  hypothesisMap: {},

  toggleWatch: (stockId) => {
    set((state) => {
      const current = state.watchMap[stockId] ?? false;
      const nextWatchMap = { ...state.watchMap, [stockId]: !current };
      writeJSON(WATCH_KEY, nextWatchMap);

      const nextStocks = state.stocks.map((stock) =>
        stock.id === stockId ? { ...stock, watched: !current } : stock
      );

      return { watchMap: nextWatchMap, stocks: nextStocks };
    });
  },

  saveMemo: (stockId, memo) => {
    set((state) => {
      const nextMemoMap = { ...state.memoMap, [stockId]: memo };
      writeJSON(MEMO_KEY, nextMemoMap);

      const nextStocks = state.stocks.map((stock) =>
        stock.id === stockId ? { ...stock, memo } : stock
      );

      return { memoMap: nextMemoMap, stocks: nextStocks };
    });
  },

  setHolding: (stockId, shares) => {
    const clamped = Math.max(0, Math.floor(shares));
    set((state) => {
      const nextHoldingsMap = { ...state.holdingsMap, [stockId]: clamped };
      writeJSON(HOLDINGS_KEY, nextHoldingsMap);
      return { holdingsMap: nextHoldingsMap };
    });
  },

  adjustHolding: (stockId, delta) => {
    set((state) => {
      const current = state.holdingsMap[stockId] ?? 0;
      const next = Math.max(0, current + delta);
      const nextHoldingsMap = { ...state.holdingsMap, [stockId]: next };
      writeJSON(HOLDINGS_KEY, nextHoldingsMap);
      return { holdingsMap: nextHoldingsMap };
    });
  },

  clearHoldings: () => {
    writeJSON(HOLDINGS_KEY, {});
    set({ holdingsMap: {} });
  },

  saveHypothesis: (stockId, patch) => {
    set((state) => {
      const current = state.hypothesisMap[stockId] ?? {
        hypothesis: "",
        rationale: "",
        reviewDate: "",
        outcome: "",
        updatedAt: ""
      };
      const next: HypothesisLog = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString()
      };
      const hypothesisMap = { ...state.hypothesisMap, [stockId]: next };
      const persisted = writeJSON(HYPOTHESIS_KEY, hypothesisMap);
      if (!persisted) {
        notifyStorageFailure("saveHypothesis");
      }
      return { hypothesisMap };
    });
  }
});

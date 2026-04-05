"use client";

import { create } from "zustand";

import { EvaluatedStock } from "@/types/stock";

import {
  createCoreSlice,
  createPortfolioSlice,
  createAlertSlice,
  createScoringSlice,
  createArchiveSlice
} from "./slices";
import type { StoreState } from "./slices";

export const useStockStore = create<StoreState>()((...a) => ({
  ...createCoreSlice(...a),
  ...createPortfolioSlice(...a),
  ...createAlertSlice(...a),
  ...createScoringSlice(...a),
  ...createArchiveSlice(...a)
}));

export function useSelectedStock(): EvaluatedStock | null {
  return useStockStore((state) => {
    if (!state.selectedStockId) {
      return null;
    }
    return state.stocks.find((stock) => stock.id === state.selectedStockId) ?? null;
  });
}

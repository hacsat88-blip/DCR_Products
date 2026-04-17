"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { BacktestResult } from "@/lib/backtest/engine";

export const BACKTEST_STORAGE_KEY = "stock-monitor:backtest:v1";

export interface StoredBacktestResult extends BacktestResult {
  id: string;
  createdAt: string;
  label?: string;
}

const MAX_HISTORY = 5;

function generateId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `bt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface BacktestState {
  history: StoredBacktestResult[];
  saveResult: (result: BacktestResult, label?: string) => StoredBacktestResult;
  removeResult: (id: string) => void;
  clear: () => void;
}

export const useBacktestStore = create<BacktestState>()(
  persist(
    (set) => ({
      history: [],
      saveResult: (result, label) => {
        const stored: StoredBacktestResult = {
          ...result,
          id: generateId(),
          createdAt: new Date().toISOString(),
          label,
        };
        set((state) => ({
          history: [stored, ...state.history].slice(0, MAX_HISTORY),
        }));
        return stored;
      },
      removeResult: (id) => {
        set((state) => ({ history: state.history.filter((r) => r.id !== id) }));
      },
      clear: () => set({ history: [] }),
    }),
    {
      name: BACKTEST_STORAGE_KEY,
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") return window.localStorage;
        const memory = new Map<string, string>();
        return {
          getItem: (k) => memory.get(k) ?? null,
          setItem: (k, v) => {
            memory.set(k, v);
          },
          removeItem: (k) => {
            memory.delete(k);
          },
        };
      }),
    },
  ),
);

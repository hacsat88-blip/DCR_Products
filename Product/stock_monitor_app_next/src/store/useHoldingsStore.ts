"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type HoldingMarket = "JP" | "US";

export interface Holding {
  id: string;
  symbol: string;
  name?: string;
  market: HoldingMarket;
  quantity: number;
  averageCost: number;
  acquiredAt: string;
  sector?: string;
  note?: string;
}

export type HoldingInput = Omit<Holding, "id">;

export const HOLDINGS_STORAGE_KEY = "stock-monitor:holdings:v1";

function generateId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) {
    return g.crypto.randomUUID();
  }
  return `hld_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface HoldingsState {
  holdings: Holding[];
  addHolding: (input: HoldingInput) => Holding;
  updateHolding: (id: string, patch: Partial<HoldingInput>) => void;
  removeHolding: (id: string) => void;
  clearAll: () => void;
  importHoldings: (items: Holding[]) => void;
  getTotalCostBasis: () => number;
  getBySector: () => Map<string, Holding[]>;
  getByMarket: () => Map<HoldingMarket, Holding[]>;
}

export const useHoldingsStore = create<HoldingsState>()(
  persist(
    (set, get) => ({
      holdings: [],
      addHolding: (input) => {
        const holding: Holding = { ...input, id: generateId() };
        set((state) => ({ holdings: [...state.holdings, holding] }));
        return holding;
      },
      updateHolding: (id, patch) => {
        set((state) => ({
          holdings: state.holdings.map((h) => (h.id === id ? { ...h, ...patch } : h)),
        }));
      },
      removeHolding: (id) => {
        set((state) => ({ holdings: state.holdings.filter((h) => h.id !== id) }));
      },
      clearAll: () => set({ holdings: [] }),
      importHoldings: (items) => set({ holdings: items }),
      getTotalCostBasis: () => {
        return get().holdings.reduce((sum, h) => sum + h.quantity * h.averageCost, 0);
      },
      getBySector: () => {
        const map = new Map<string, Holding[]>();
        for (const h of get().holdings) {
          const key = h.sector ?? "未分類";
          const list = map.get(key) ?? [];
          list.push(h);
          map.set(key, list);
        }
        return map;
      },
      getByMarket: () => {
        const map = new Map<HoldingMarket, Holding[]>();
        for (const h of get().holdings) {
          const list = map.get(h.market) ?? [];
          list.push(h);
          map.set(h.market, list);
        }
        return map;
      },
    }),
    {
      name: HOLDINGS_STORAGE_KEY,
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") {
          return window.localStorage;
        }
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
      partialize: (state) => ({ holdings: state.holdings }),
    },
  ),
);

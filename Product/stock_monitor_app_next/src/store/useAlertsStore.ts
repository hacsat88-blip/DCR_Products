"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const ALERTS_STORAGE_KEY = "stock-monitor:alerts:v1";

export type AlertMarket = "JP" | "US";
export type AlertOp = ">=" | "<=" | "cross_up" | "cross_down";
export type AlertField = "price" | "changePct";
export type AlertChannel = "discord" | "line" | "email";

export interface AlertRule {
  id: string;
  symbol: string;
  market: AlertMarket;
  condition: {
    op: AlertOp;
    target: number;
    field: AlertField;
  };
  notifyChannels: AlertChannel[];
  enabled: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
}

export type AlertRuleInput = Omit<AlertRule, "id" | "createdAt" | "lastTriggeredAt">;

function generateId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `al_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface AlertsState {
  rules: AlertRule[];
  add: (input: AlertRuleInput) => AlertRule;
  update: (id: string, patch: Partial<AlertRuleInput>) => void;
  remove: (id: string) => void;
  setEnabled: (id: string, enabled: boolean) => void;
  markTriggered: (id: string, at?: string) => void;
  clear: () => void;
}

export const useAlertsStore = create<AlertsState>()(
  persist(
    (set) => ({
      rules: [],
      add: (input) => {
        const rule: AlertRule = {
          ...input,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ rules: [rule, ...state.rules] }));
        return rule;
      },
      update: (id, patch) => {
        set((state) => ({
          rules: state.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }));
      },
      remove: (id) => {
        set((state) => ({ rules: state.rules.filter((r) => r.id !== id) }));
      },
      setEnabled: (id, enabled) => {
        set((state) => ({
          rules: state.rules.map((r) => (r.id === id ? { ...r, enabled } : r)),
        }));
      },
      markTriggered: (id, at) => {
        const when = at ?? new Date().toISOString();
        set((state) => ({
          rules: state.rules.map((r) => (r.id === id ? { ...r, lastTriggeredAt: when } : r)),
        }));
      },
      clear: () => set({ rules: [] }),
    }),
    {
      name: ALERTS_STORAGE_KEY,
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

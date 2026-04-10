"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DataMode, ProviderHealth } from "@/services/providers/types";
import { useStockStore } from "@/store/useStockStore";
import { SourceLabel, StockSourceMeta } from "@/types/source";

import { PollingOptions, startPolling } from "./polling";

type MarketDataPhase = "idle" | "phase1_price" | "phase2_fundamentals";

export interface UseMarketDataOptions {
  enabled?: boolean;
  refreshIntervalMs?: number;
  polling?: PollingOptions;
}

interface UseMarketDataResult {
  phase: MarketDataPhase;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  dataMode: DataMode;
  sourceLabel: SourceLabel | null;
  sourceMeta: StockSourceMeta;
  health: ProviderHealth[];
  refresh: () => Promise<void>;
}

function shouldFetchFundamentals(): boolean {
  const state = useStockStore.getState();
  if (state.dataMode === "mock") {
    return false;
  }
  const hasMissingFundamentals = state.stocks.some(
    (stock) => stock.revenueGrowth === null || stock.opGrowth === null || stock.operatingCF === null
  );
  const edinetHealth = state.health.find((item) => item.provider === "edinetDb");
  const isDeferred = edinetHealth?.decision === "deferred" || edinetHealth?.message === "deferred to phase2";
  return hasMissingFundamentals || Boolean(isDeferred);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function useMarketData(options: UseMarketDataOptions = {}): UseMarketDataResult {
  const { enabled = true, refreshIntervalMs = 5 * 60 * 1000, polling } = options;
  const pollingMode = polling?.mode ?? "interval";
  const pollingSchedule = polling?.controller?.schedule;
  const registeredCodesKey = useStockStore((s) => s.registeredCodes.join(","));
  const refreshStocks = useStockStore((s) => s.refreshStocks);
  const isLoading = useStockStore((s) => s.isLoading);
  const error = useStockStore((s) => s.error);
  const lastUpdated = useStockStore((s) => s.lastUpdatedAt);
  const dataMode = useStockStore((s) => s.dataMode);
  const sourceLabel = useStockStore((s) => s.sourceLabel);
  const sourceMeta = useStockStore((s) => s.sourceMeta);
  const health = useStockStore((s) => s.health);

  const [phase, setPhase] = useState<MarketDataPhase>("idle");
  const abortRef = useRef<AbortController | null>(null);

  const cancelActiveRequest = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const refresh = useCallback(async () => {
    cancelActiveRequest();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setPhase("phase1_price");
      await refreshStocks({ phase: "price", signal: controller.signal });
      if (controller.signal.aborted) {
        return;
      }

      if (shouldFetchFundamentals()) {
        setPhase("phase2_fundamentals");
        await refreshStocks({ phase: "full", signal: controller.signal });
      }
    } catch (error) {
      if (!isAbortError(error)) {
        console.error("[useMarketData] refresh failed", error);
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setPhase("idle");
      }
    }
  }, [cancelActiveRequest, refreshStocks]);

  useEffect(() => {
    if (!enabled) {
      cancelActiveRequest();
      setPhase("idle");
      return;
    }

    void refresh();
    const stopPolling = startPolling(() => {
      void refresh();
    }, refreshIntervalMs, pollingSchedule ? { mode: pollingMode, controller: { schedule: pollingSchedule } } : { mode: pollingMode });

    return () => {
      stopPolling();
      cancelActiveRequest();
    };
  }, [enabled, refresh, refreshIntervalMs, registeredCodesKey, cancelActiveRequest, pollingMode, pollingSchedule]);

  return {
    phase,
    loading: isLoading || phase !== "idle",
    error,
    lastUpdated,
    dataMode,
    sourceLabel,
    sourceMeta,
    health,
    refresh
  };
}

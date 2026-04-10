"use client";

import { useEffect, useState } from "react";

import { useStockStore } from "@/store/useStockStore";

import { PollingOptions, startPolling } from "./polling";

export interface UseAutoRefreshOptions {
  polling?: PollingOptions;
}

export function useAutoRefresh(options: UseAutoRefreshOptions = {}): { nextRefreshAt: Date | null } {
  const pollingMode = options.polling?.mode ?? "interval";
  const pollingSchedule = options.polling?.controller?.schedule;
  const autoRefreshEnabled = useStockStore((s) => s.autoRefreshEnabled);
  const refreshIntervalMinutes = useStockStore((s) => s.refreshIntervalMinutes);
  const isLoading = useStockStore((s) => s.isLoading);
  const refreshStocks = useStockStore((s) => s.refreshStocks);

  const [nextRefreshAt, setNextRefreshAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!autoRefreshEnabled || isLoading) {
      if (!autoRefreshEnabled) {
        setNextRefreshAt(null);
      }
      return;
    }

    const intervalMs = refreshIntervalMinutes * 60 * 1000;
    const next = new Date(Date.now() + intervalMs);
    setNextRefreshAt(next);

    const stopPolling = startPolling(() => {
      const nowMs = Date.now();
      if (next.getTime() <= nowMs) {
        void refreshStocks();
        const newNext = new Date(nowMs + intervalMs);
        setNextRefreshAt(newNext);
      }
    }, intervalMs, pollingSchedule ? { mode: pollingMode, controller: { schedule: pollingSchedule } } : { mode: pollingMode });

    return stopPolling;
  }, [autoRefreshEnabled, refreshIntervalMinutes, isLoading, refreshStocks, pollingMode, pollingSchedule]);

  return { nextRefreshAt: autoRefreshEnabled ? nextRefreshAt : null };
}

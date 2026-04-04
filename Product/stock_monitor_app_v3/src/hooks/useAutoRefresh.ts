"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useStockStore } from "@/store/useStockStore";

export function useAutoRefresh(): { nextRefreshAt: Date | null } {
  const autoRefreshEnabled = useStockStore((s) => s.autoRefreshEnabled);
  const refreshIntervalMinutes = useStockStore((s) => s.refreshIntervalMinutes);
  const isLoading = useStockStore((s) => s.isLoading);
  const refreshStocks = useStockStore((s) => s.refreshStocks);

  const [nextRefreshAt, setNextRefreshAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearTimer();

    if (!autoRefreshEnabled || isLoading) {
      if (!autoRefreshEnabled) {
        setNextRefreshAt(null);
      }
      return;
    }

    const intervalMs = refreshIntervalMinutes * 60 * 1000;
    const next = new Date(Date.now() + intervalMs);
    setNextRefreshAt(next);

    timerRef.current = setInterval(() => {
      const nowMs = Date.now();
      if (next.getTime() <= nowMs) {
        void refreshStocks();
        const newNext = new Date(nowMs + intervalMs);
        setNextRefreshAt(newNext);
      }
    }, intervalMs);

    return clearTimer;
  }, [autoRefreshEnabled, refreshIntervalMinutes, isLoading, refreshStocks, clearTimer]);

  return { nextRefreshAt: autoRefreshEnabled ? nextRefreshAt : null };
}

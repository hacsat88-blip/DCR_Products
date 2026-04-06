"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export type CandleTimeframe = "5m" | "15m" | "1h" | "1d" | "1wk";

export type OhlcPoint = {
  date: string;
  time: number; // Unix seconds (lightweight-charts compatible)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type NikkeiOhlcState = {
  ohlc: OhlcPoint[];
  loading: boolean;
  error: string | null;
  source: string;
  latestClose: number | null;
  diff: number | null;
  diffPercent: number | null;
};

// ── Timeframe → API routing ──────────────────────────────────────────────────

const INTRADAY_MAP: Partial<Record<CandleTimeframe, string>> = {
  "5m": "5min",
  "15m": "15min",
  "1h": "60min",
};

const YAHOO_MAP: Partial<Record<CandleTimeframe, { range: string; interval: string }>> = {
  "1d": { range: "3mo", interval: "1d" },
  "1wk": { range: "1y", interval: "1wk" },
};

function isIntraday(tf: CandleTimeframe): boolean {
  return tf in INTRADAY_MAP;
}

// ── Initial state ────────────────────────────────────────────────────────────

const INITIAL: NikkeiOhlcState = {
  ohlc: [],
  loading: true,
  error: null,
  source: "",
  latestClose: null,
  diff: null,
  diffPercent: null,
};

function computeAdjacentChange(points: OhlcPoint[]): {
  latestClose: number | null;
  diff: number | null;
  diffPercent: number | null;
} {
  const last = points.length > 0 ? points[points.length - 1] : null;
  const previous = points.length > 1 ? points[points.length - 2] : null;
  const latestClose = last?.close ?? null;
  const prevClose = previous?.close ?? null;
  const diff =
    latestClose !== null && prevClose !== null ? latestClose - prevClose : null;
  const diffPercent =
    diff !== null && prevClose !== null && prevClose !== 0
      ? (diff / prevClose) * 100
      : null;

  return { latestClose, diff, diffPercent };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useNikkeiOhlc(timeframe: CandleTimeframe = "1d") {
  const [state, setState] = useState<NikkeiOhlcState>(INITIAL);

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // ── Build request URL based on timeframe ──
      let url: string;

      if (isIntraday(timeframe)) {
        const interval = INTRADAY_MAP[timeframe]!;
        url = `/api/market-index-intraday?symbol=1321.T&interval=${interval}`;
      } else {
        const { range, interval } = YAHOO_MAP[timeframe]!;
        url = `/api/market-index?range=${range}&format=ohlc&interval=${interval}`;
      }

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();

      // ── Normalize response ──
      const ohlc: OhlcPoint[] = Array.isArray(json.ohlc) ? json.ohlc : [];

      if (isIntraday(timeframe)) {
        // Alpha Vantage payload: { symbol, interval, source, ohlc, error }
        if (json.error) {
          setState({
            ohlc: [],
            loading: false,
            error: String(json.error),
            source: "alpha_vantage",
            latestClose: null,
            diff: null,
            diffPercent: null,
          });
          return;
        }

        const { latestClose, diff, diffPercent } = computeAdjacentChange(ohlc);

        setState({
          ohlc,
          loading: false,
          error: null,
          source: "alpha_vantage",
          latestClose,
          diff,
          diffPercent,
        });
      } else {
        // Yahoo Finance payload: { latestClose, diff, diffPercent, source, ohlc, ... }
        const adjacent = computeAdjacentChange(ohlc);
        const latestClose =
          typeof json.latestClose === "number" && Number.isFinite(json.latestClose)
            ? json.latestClose
            : adjacent.latestClose;
        const diff =
          typeof json.diff === "number" && Number.isFinite(json.diff)
            ? json.diff
            : adjacent.diff;
        const diffPercent =
          typeof json.diffPercent === "number" && Number.isFinite(json.diffPercent)
            ? json.diffPercent
            : adjacent.diffPercent;

        setState({
          ohlc,
          loading: false,
          error: null,
          source: "yahoo_finance",
          latestClose,
          diff,
          diffPercent,
        });
      }
    } catch (e) {
      setState({
        ohlc: [],
        loading: false,
        error: e instanceof Error ? e.message : "Unknown error",
        source: "",
        latestClose: null,
        diff: null,
        diffPercent: null,
      });
    }
  }, [timeframe]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ohlc: state.ohlc,
    loading: state.loading,
    error: state.error,
    source: state.source,
    latestClose: state.latestClose,
    diff: state.diff,
    diffPercent: state.diffPercent,
    refetch: fetchData,
  };
}

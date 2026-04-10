"use client";

import { useState, useEffect, useCallback } from "react";

import { getTokyoMarketSession, TokyoMarketSession } from "@/lib/tradingHours";
import { normalizeMarketSourceName } from "@/services/providers/types";

// ── Types ────────────────────────────────────────────────────────────────────

export type CandleTimeframe = "5m" | "15m" | "1h" | "1d" | "1wk";
export type NikkeiDataStatus = "live" | "cached" | "stale" | "fallback" | null;

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
  asOf: string | null;
  dataStatus: NikkeiDataStatus;
  marketSession: TokyoMarketSession;
  requestedTimeframe: CandleTimeframe;
  resolvedTimeframe: CandleTimeframe;
  latestClose: number | null;
  diff: number | null;
  diffPercent: number | null;
};

export interface UseNikkeiOhlcOptions {
  enabled?: boolean;
  refreshKey?: string | null;
  now?: Date;
}

type NikkeiOhlcPayload = {
  source?: string;
  sourceLabel?: string;
  asOf?: string | null;
  sourceTimestamp?: string | null;
  fetchedAt?: string | null;
  ohlc?: OhlcPoint[];
  error?: string | null;
  latestClose?: number | null;
  diff?: number | null;
  diffPercent?: number | null;
};

type RequestCandidate = {
  url: string;
  source: "yahoo_finance" | "alpha_vantage";
  fallbackUsed: boolean;
  requestedTimeframe: CandleTimeframe;
  resolvedTimeframe: CandleTimeframe;
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

const YAHOO_INTRADAY_RANGE: Record<Extract<CandleTimeframe, "5m" | "15m" | "1h">, string> = {
  "5m": "1d",
  "15m": "1d",
  "1h": "5d"
};

function isIntraday(tf: CandleTimeframe): boolean {
  return tf in INTRADAY_MAP;
}

function createInitialState(
  timeframe: CandleTimeframe,
  marketSession: TokyoMarketSession
): NikkeiOhlcState {
  return {
    ohlc: [],
    loading: true,
    error: null,
    source: "",
    asOf: null,
    dataStatus: null,
    marketSession,
    requestedTimeframe: timeframe,
    resolvedTimeframe: timeframe,
    latestClose: null,
    diff: null,
    diffPercent: null
  };
}

export function buildRequestCandidates(timeframe: CandleTimeframe): RequestCandidate[] {
  if (isIntraday(timeframe)) {
    const intradayRange = YAHOO_INTRADAY_RANGE[timeframe as "5m" | "15m" | "1h"];
    const alphaInterval = INTRADAY_MAP[timeframe]!;

    return [
      {
        url: `/api/market-index?range=${intradayRange}&format=ohlc&interval=${timeframe}`,
        source: "yahoo_finance",
        fallbackUsed: false,
        requestedTimeframe: timeframe,
        resolvedTimeframe: timeframe
      },
      {
        url: `/api/market-index-intraday?symbol=1321.T&interval=${alphaInterval}`,
        source: "alpha_vantage",
        fallbackUsed: true,
        requestedTimeframe: timeframe,
        resolvedTimeframe: timeframe
      }
    ];
  }

  const { range, interval } = YAHOO_MAP[timeframe]!;
  return [
    {
      url: `/api/market-index?range=${range}&format=ohlc&interval=${interval}`,
      source: "yahoo_finance",
      fallbackUsed: false,
      requestedTimeframe: timeframe,
      resolvedTimeframe: timeframe
    }
  ];
}

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value || !value.trim()) {
    return null;
  }

  const direct = Date.parse(value);
  if (!Number.isNaN(direct)) {
    return direct;
  }

  const normalized = Date.parse(value.replace(" ", "T"));
  return Number.isNaN(normalized) ? null : normalized;
}

export function resolveNikkeiDataStatus(
  asOf: string | null,
  marketSession: TokyoMarketSession,
  fallbackUsed: boolean,
  now: Date = new Date()
): NikkeiDataStatus {
  if (fallbackUsed) {
    return "fallback";
  }

  const parsed = parseTimestamp(asOf);
  if (parsed === null) {
    return null;
  }

  const ageMinutes = Math.max(0, (now.getTime() - parsed) / (60 * 1000));
  const isTradingSession = marketSession === "morning" || marketSession === "afternoon";

  if (isTradingSession && ageMinutes <= 10) {
    return "live";
  }
  if (ageMinutes <= 60) {
    return "cached";
  }
  return "stale";
}

// ── Initial state ────────────────────────────────────────────────────────────

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

export function normalizeNikkeiOhlcPayload(
  payload: NikkeiOhlcPayload,
  candidate: RequestCandidate,
  marketSession: TokyoMarketSession,
  now: Date = new Date()
): NikkeiOhlcState {
  const ohlc = Array.isArray(payload.ohlc) ? payload.ohlc : [];
  const adjacent = computeAdjacentChange(ohlc);
  const payloadSource = normalizeMarketSourceName(payload.source) ?? normalizeMarketSourceName(payload.sourceLabel);
  const source = payloadSource ?? candidate.source;
  const fallbackUsed = candidate.fallbackUsed || source === "alpha_vantage";
  const asOf =
    typeof payload.sourceTimestamp === "string" && payload.sourceTimestamp.trim()
      ? payload.sourceTimestamp
      : 
    typeof payload.asOf === "string" && payload.asOf.trim()
      ? payload.asOf
      : ohlc.length > 0
        ? ohlc[ohlc.length - 1].date
        : typeof payload.fetchedAt === "string" && payload.fetchedAt.trim()
          ? payload.fetchedAt
          : null;

  return {
    ohlc,
    loading: false,
    error: payload.error ? String(payload.error) : null,
    source,
    asOf,
    dataStatus: resolveNikkeiDataStatus(asOf, marketSession, fallbackUsed, now),
    marketSession,
    requestedTimeframe: candidate.requestedTimeframe,
    resolvedTimeframe: candidate.resolvedTimeframe,
    latestClose:
      typeof payload.latestClose === "number" && Number.isFinite(payload.latestClose)
        ? payload.latestClose
        : adjacent.latestClose,
    diff:
      typeof payload.diff === "number" && Number.isFinite(payload.diff)
        ? payload.diff
        : adjacent.diff,
    diffPercent:
      typeof payload.diffPercent === "number" && Number.isFinite(payload.diffPercent)
        ? payload.diffPercent
        : adjacent.diffPercent
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useNikkeiOhlc(
  timeframe: CandleTimeframe = "1d",
  options: UseNikkeiOhlcOptions = {}
) {
  const { enabled = true, refreshKey = null, now } = options;
  const nowKey = now?.toISOString() ?? "";
  const referenceTimeMs = nowKey ? Date.parse(nowKey) : Number.NaN;
  const [state, setState] = useState<NikkeiOhlcState>(() =>
    createInitialState(
      timeframe,
      getTokyoMarketSession(Number.isNaN(referenceTimeMs) ? new Date() : new Date(referenceTimeMs))
    )
  );

  const fetchData = useCallback(async () => {
    const referenceTime = Number.isNaN(referenceTimeMs) ? new Date() : new Date(referenceTimeMs);
    const marketSession = getTokyoMarketSession(referenceTime);

    if (!enabled) {
      setState({
        ...createInitialState(timeframe, marketSession),
        loading: false
      });
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      marketSession,
      requestedTimeframe: timeframe
    }));

    const errors: string[] = [];
    try {
      for (const candidate of buildRequestCandidates(timeframe)) {
        const res = await fetch(candidate.url, { cache: "no-store" });
        if (!res.ok) {
          errors.push(`${candidate.source}: HTTP ${res.status}`);
          continue;
        }

        const json = (await res.json()) as NikkeiOhlcPayload;
        const normalized = normalizeNikkeiOhlcPayload(json, candidate, marketSession, referenceTime);

        if (normalized.error || normalized.ohlc.length === 0) {
          if (normalized.error) {
            errors.push(`${candidate.source}: ${normalized.error}`);
          }
          continue;
        }

        setState(normalized);
        return;
      }

      setState({
        ...createInitialState(timeframe, marketSession),
        loading: false,
        error: errors.length > 0 ? errors.join(" / ") : "Unknown error"
      });
    } catch (error) {
      setState({
        ...createInitialState(timeframe, marketSession),
        loading: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }, [enabled, referenceTimeMs, timeframe]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, refreshKey, nowKey]);

  return {
    ohlc: state.ohlc,
    loading: state.loading,
    error: state.error,
    source: state.source,
    asOf: state.asOf,
    dataStatus: state.dataStatus,
    marketSession: state.marketSession,
    requestedTimeframe: state.requestedTimeframe,
    resolvedTimeframe: state.resolvedTimeframe,
    latestClose: state.latestClose,
    diff: state.diff,
    diffPercent: state.diffPercent,
    refetch: fetchData
  };
}

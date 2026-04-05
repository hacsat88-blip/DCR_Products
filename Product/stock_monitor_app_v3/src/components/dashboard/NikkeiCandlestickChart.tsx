"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import clsx from "clsx";

import {
  useNikkeiOhlc,
  CandleTimeframe,
} from "@/hooks/useNikkeiOhlc";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NikkeiCandlestickChartProps {
  lastUpdatedAt: string | null;
}

type TimeframeOption = {
  label: string;
  value: CandleTimeframe;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "日足", value: "1d" },
  { label: "週足", value: "1wk" },
];

const SOURCE_LABELS: Record<string, string> = {
  yahoo_finance: "Yahoo Finance",
  alpha_vantage: "Alpha Vantage",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "---";
  return value.toLocaleString("ja-JP", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDiff(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("ja-JP", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "";
  const sign = value > 0 ? "+" : "";
  return `(${sign}${value.toFixed(2)}%)`;
}

// ── Chart Component (Inner) ───────────────────────────────────────────────────

function CandlestickChartInner(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _props: NikkeiCandlestickChartProps,
): JSX.Element {
  const [timeframe, setTimeframe] = useState<CandleTimeframe>("1d");
  const { ohlc, loading, error, source, latestClose, diff, diffPercent, refetch } =
    useNikkeiOhlc(timeframe);

  // ── Refs for imperative chart management ──
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  const candleSeriesRef = useRef<unknown>(null);
  const volumeSeriesRef = useRef<unknown>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // ── Chart initialization (runs once on mount, client-side only) ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    import("lightweight-charts").then((lc) => {
      if (disposed || !container) return;

      const { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries } = lc;

      // ── Create chart with cyber theme ──
      const chart = createChart(container, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#00ff41",
          fontSize: 11,
          fontFamily: "Share Tech Mono, monospace",
        },
        grid: {
          vertLines: { color: "rgba(0,255,65,0.06)" },
          horzLines: { color: "rgba(0,255,65,0.06)" },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: "rgba(0,255,65,0.3)",
            labelBackgroundColor: "#003d0f",
          },
          horzLine: {
            color: "rgba(0,255,65,0.3)",
            labelBackgroundColor: "#003d0f",
          },
        },
        timeScale: {
          borderColor: "rgba(0,255,65,0.18)",
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          borderColor: "rgba(0,255,65,0.18)",
        },
        width: container.clientWidth,
        height: container.clientHeight,
      });

      // ── Candlestick series ──
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#00ff41",
        downColor: "#ff3355",
        borderUpColor: "#00ff41",
        borderDownColor: "#ff3355",
        wickUpColor: "#00cc33",
        wickDownColor: "#cc2944",
      });

      // ── Volume histogram series ──
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: "rgba(0,255,65,0.15)",
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      });

      chart.priceScale("volume").applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      chartRef.current = chart;
      candleSeriesRef.current = candleSeries;
      volumeSeriesRef.current = volumeSeries;

      // ── ResizeObserver for responsive width ──
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            chart.applyOptions({ width, height });
          }
        }
      });
      ro.observe(container);
      resizeObserverRef.current = ro;
    });

    // ── Cleanup on unmount ──
    return () => {
      disposed = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []); // mount once

  // ── Update data when ohlc changes ──
  const updateChart = useCallback(() => {
    if (!chartRef.current || !candleSeriesRef.current || !volumeSeriesRef.current) return;
    if (ohlc.length === 0) return;

    // Type assertion needed because we store refs as unknown
    const candleSeries = candleSeriesRef.current as {
      setData: (data: Array<{ time: number; open: number; high: number; low: number; close: number }>) => void;
    };
    const volumeSeries = volumeSeriesRef.current as {
      setData: (data: Array<{ time: number; value: number; color: string }>) => void;
    };

    // ── Map OHLC data for candlestick series ──
    const candleData = ohlc.map((p) => ({
      time: p.time as number,
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
    }));

    // ── Map volume data with color based on candle direction ──
    const volumeData = ohlc.map((p) => ({
      time: p.time as number,
      value: p.volume,
      color:
        p.close >= p.open
          ? "rgba(0,255,65,0.18)"
          : "rgba(255,51,85,0.18)",
    }));

    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);
    chartRef.current.timeScale().fitContent();
  }, [ohlc]);

  useEffect(() => {
    updateChart();
  }, [updateChart]);

  // ── Derived display values ──
  const isPositive = diff !== null && diff >= 0;
  const diffArrow = diff !== null && diff !== 0 ? (isPositive ? "↑" : "↓") : "";
  const sourceLabel = SOURCE_LABELS[source] ?? source;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <section className="card-surface p-4">
      {/* ── Header area ── */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Title + price */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-orb text-xs font-semibold uppercase tracking-widest text-text-muted">
              日経平均 <span className="text-mint/40">{"//"}</span> NIKKEI 225
            </h2>
            {sourceLabel && (
              <span className="inline-flex shrink-0 items-center rounded-none border border-glass-border px-1.5 py-0.5 font-mono-tech text-[9px] uppercase tracking-wider text-text-muted/60">
                {sourceLabel}
              </span>
            )}
          </div>

          {/* Price + diff */}
          {loading && latestClose === null ? (
            <div className="mt-2 h-10 w-48 animate-pulse-soft rounded bg-panel-elevated" />
          ) : (
            <div className="mt-1.5 flex flex-wrap items-baseline gap-2.5">
              <span className="font-mono-tech text-3xl font-bold tabular-nums tracking-tight text-text-primary md:text-kpi">
                {formatPrice(latestClose)}
              </span>
              {diff !== null && (
                <span
                  className={clsx(
                    "flex items-center gap-1 font-mono-tech text-sm tabular-nums",
                    isPositive ? "text-mint" : "text-danger"
                  )}
                >
                  <span className="text-base leading-none">{diffArrow}</span>
                  {formatDiff(diff)}
                  <span className="text-xs opacity-70">
                    {formatPercent(diffPercent)}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Timeframe selector ── */}
        <div className="flex shrink-0 items-center gap-1">
          {TIMEFRAME_OPTIONS.map((opt) => {
            const isActive = timeframe === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTimeframe(opt.value)}
                className={clsx(
                  "cyber-btn whitespace-nowrap px-2.5 py-1 text-[10px]",
                  isActive && "active"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Chart container ── */}
      {error ? (
        // ── Error state ──
        <div className="flex h-[300px] flex-col items-center justify-center gap-3 md:h-[400px]">
          <div className="text-center">
            <p className="font-mono-tech text-sm text-danger">
              ⚠ エラーが発生しました
            </p>
            <p className="mt-1 font-mono-tech text-xs text-text-muted">
              {error}
            </p>
          </div>
          <button
            type="button"
            onClick={refetch}
            className="cyber-btn px-4 py-1.5 text-[10px]"
          >
            再試行
          </button>
        </div>
      ) : loading && ohlc.length === 0 ? (
        // ── Loading skeleton ──
        <div className="relative h-[300px] overflow-hidden md:h-[400px]">
          {/* Simulated chart skeleton */}
          <div className="absolute inset-0 animate-pulse-soft rounded bg-panel-elevated/40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin-slow text-mint/50"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="30 70"
                />
              </svg>
              <span className="font-mono-tech text-xs uppercase tracking-wider text-text-muted">
                Loading chart data...
              </span>
            </div>
          </div>
          {/* Grid lines skeleton */}
          <div className="absolute inset-x-0 top-1/4 h-px bg-mint/5" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-mint/5" />
          <div className="absolute inset-x-0 top-3/4 h-px bg-mint/5" />
        </div>
      ) : ohlc.length === 0 ? (
        // ── Empty state ──
        <div className="flex h-[300px] items-center justify-center md:h-[400px]">
          <p className="font-mono-tech text-sm text-text-muted">
            データなし
          </p>
        </div>
      ) : null}

      {/* Chart div — always rendered for ref, hidden when no data */}
      <div
        ref={containerRef}
        className={clsx(
          "h-[300px] w-full md:h-[400px]",
          (error || (ohlc.length === 0)) && "hidden"
        )}
      />

      {/* ── Footer: loading overlay during refetch ── */}
      {loading && ohlc.length > 0 && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="h-1 w-1 animate-pulse-soft rounded-full bg-mint/60" />
          <span className="font-mono-tech text-[9px] uppercase tracking-wider text-text-muted/50">
            Updating...
          </span>
        </div>
      )}
    </section>
  );
}

// ── Memoized export ───────────────────────────────────────────────────────────

export function NikkeiCandlestickChart(props: NikkeiCandlestickChartProps): JSX.Element {
  return <CandlestickChartInner {...props} />;
}

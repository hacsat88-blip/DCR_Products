"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";

import {
  CandleTimeframe,
  NikkeiDataStatus,
  useNikkeiOhlc,
} from "@/hooks/useNikkeiOhlc";
import { getMarketSourceLabel, normalizeMarketSourceName } from "@/services/providers/types";
import {
  formatTokyoMarketSessionLabel,
  isTokyoTradingHours,
  resolveDefaultNikkeiTimeframe,
} from "@/lib/tradingHours";

import { LIGHTWEIGHT_CHART_THEME } from "@/components/ui/ChartTheme";

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

const STATUS_LABELS: Record<Exclude<NikkeiDataStatus, null>, string> = {
  live: "LIVE",
  cached: "CACHED",
  stale: "STALE",
  fallback: "FALLBACK",
};

const STATUS_CLASS_NAMES: Record<Exclude<NikkeiDataStatus, null>, string> = {
  live: "border-positive/30 bg-positive/10 text-positive",
  cached: "border-warning/30 bg-warning/10 text-warning",
  stale: "border-danger/30 bg-danger/10 text-danger",
  fallback: "border-caution/30 bg-caution/10 text-caution",
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

function formatAsOf(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(parsed));
  }

  return value.replace("T", " ").slice(0, 16);
}

// ── Chart Component (Inner) ───────────────────────────────────────────────────

function CandlestickChartInner({ lastUpdatedAt }: NikkeiCandlestickChartProps): JSX.Element {
  const [timeframe, setTimeframe] = useState<CandleTimeframe>(() => resolveDefaultNikkeiTimeframe());
  const {
    ohlc,
    loading,
    error,
    source,
    asOf,
    dataStatus,
    marketSession,
    latestClose,
    diff,
    diffPercent,
    refetch,
  } = useNikkeiOhlc(timeframe, { refreshKey: lastUpdatedAt });

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  const candleSeriesRef = useRef<unknown>(null);
  const volumeSeriesRef = useRef<unknown>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    import("lightweight-charts").then((lc) => {
      if (disposed || !container) return;

      const { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries } = lc;
      const chart = createChart(container, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: LIGHTWEIGHT_CHART_THEME.layoutTextColor,
          fontSize: 11,
          fontFamily: "Share Tech Mono, monospace",
        },
        grid: {
          vertLines: { color: LIGHTWEIGHT_CHART_THEME.gridLineColor },
          horzLines: { color: LIGHTWEIGHT_CHART_THEME.gridLineColor },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: LIGHTWEIGHT_CHART_THEME.crosshairLineColor,
            labelBackgroundColor: LIGHTWEIGHT_CHART_THEME.crosshairLabelBackground,
          },
          horzLine: {
            color: LIGHTWEIGHT_CHART_THEME.crosshairLineColor,
            labelBackgroundColor: LIGHTWEIGHT_CHART_THEME.crosshairLabelBackground,
          },
        },
        timeScale: {
          borderColor: LIGHTWEIGHT_CHART_THEME.scaleBorderColor,
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          borderColor: LIGHTWEIGHT_CHART_THEME.scaleBorderColor,
        },
        width: container.clientWidth,
        height: container.clientHeight,
      });

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: LIGHTWEIGHT_CHART_THEME.candle.upColor,
        downColor: LIGHTWEIGHT_CHART_THEME.candle.downColor,
        borderUpColor: LIGHTWEIGHT_CHART_THEME.candle.borderUpColor,
        borderDownColor: LIGHTWEIGHT_CHART_THEME.candle.borderDownColor,
        wickUpColor: LIGHTWEIGHT_CHART_THEME.candle.wickUpColor,
        wickDownColor: LIGHTWEIGHT_CHART_THEME.candle.wickDownColor,
      });

      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: LIGHTWEIGHT_CHART_THEME.volume.positive,
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      });

      chart.priceScale("volume").applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      chartRef.current = chart;
      candleSeriesRef.current = candleSeries;
      volumeSeriesRef.current = volumeSeries;

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            chart.applyOptions({ width, height });
          }
        }
      });

      resizeObserver.observe(container);
      resizeObserverRef.current = resizeObserver;
    });

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
  }, []);

  const updateChart = useCallback(() => {
    if (!chartRef.current || !candleSeriesRef.current || !volumeSeriesRef.current || ohlc.length === 0) {
      return;
    }

    const candleSeries = candleSeriesRef.current as {
      setData: (data: Array<{ time: number; open: number; high: number; low: number; close: number }>) => void;
    };
    const volumeSeries = volumeSeriesRef.current as {
      setData: (data: Array<{ time: number; value: number; color: string }>) => void;
    };

    candleSeries.setData(
      ohlc.map((point) => ({
        time: point.time,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
      }))
    );

    volumeSeries.setData(
      ohlc.map((point) => ({
        time: point.time,
        value: point.volume,
        color:
          point.close >= point.open
            ? LIGHTWEIGHT_CHART_THEME.volume.positive
            : LIGHTWEIGHT_CHART_THEME.volume.negative,
      }))
    );

    chartRef.current.timeScale().fitContent();
  }, [ohlc]);

  useEffect(() => {
    updateChart();
  }, [updateChart]);

  const isPositive = diff !== null && diff >= 0;
  const diffArrow = diff !== null && diff !== 0 ? (isPositive ? "↑" : "↓") : "";
  const normalizedSource = normalizeMarketSourceName(source);
  const sourceLabel = getMarketSourceLabel(source);
  const effectiveStatus: NikkeiDataStatus =
    normalizedSource === "alpha_vantage" && dataStatus !== "fallback" ? "fallback" : dataStatus;
  const statusLabel = effectiveStatus ? STATUS_LABELS[effectiveStatus] : null;
  const statusClassName = effectiveStatus ? STATUS_CLASS_NAMES[effectiveStatus] : null;
  const marketSessionLabel = formatTokyoMarketSessionLabel(marketSession);
  const asOfLabel = formatAsOf(asOf);
  const isTokyoMarketOpen = isTokyoTradingHours();
  const marketGuidanceText = isTokyoMarketOpen
    ? "取引時間中は 5 分足に切り替えると動きが追いやすいです。"
    : "引け後は終値/直近値が据え置きのことがあり、手動更新しても変わらない場合があります。";

  return (
    <section className="card-surface p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-xs font-semibold uppercase tracking-widest text-text-muted">
              日経平均 <span className="text-positive/40">{"//"}</span> NIKKEI 225
            </h2>
            {sourceLabel && (
              <span className="inline-flex shrink-0 items-center rounded-lg border border-glass-border px-1.5 py-0.5 font-mono tabular-nums text-[9px] uppercase tracking-wider text-text-muted/60">
                {sourceLabel}
              </span>
            )}
            {statusLabel && statusClassName && (
              <span
                className={clsx(
                  "inline-flex shrink-0 items-center gap-1 rounded-lg border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                  statusClassName
                )}
              >
                {effectiveStatus === "live" && <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-current" />}
                {statusLabel}
              </span>
            )}
            <span className="inline-flex shrink-0 items-center rounded-lg border border-glass-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-text-muted/70">
              東証 {marketSessionLabel}
            </span>
          </div>

          {loading && latestClose === null ? (
            <div className="mt-2 h-10 w-48 animate-pulse-soft rounded bg-panel-elevated" />
          ) : (
            <div className="mt-1.5 flex flex-wrap items-baseline gap-2.5">
              <span className="font-mono tabular-nums text-3xl font-bold tracking-tight text-text-primary md:text-kpi">
                {formatPrice(latestClose)}
              </span>
              {diff !== null && (
                <span
                  className={clsx(
                    "flex items-center gap-1 font-mono tabular-nums text-sm",
                    isPositive ? "text-positive" : "text-danger"
                  )}
                >
                  <span className="text-base leading-none">{diffArrow}</span>
                  {formatDiff(diff)}
                  <span className="text-xs opacity-70">{formatPercent(diffPercent)}</span>
                </span>
              )}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted">
            <span>初期表示: 取引中は5分足優先</span>
            {asOfLabel && <span>最終反映 {asOfLabel} JST</span>}
            {effectiveStatus === "fallback" && <span>Yahoo 不調時は Alpha Vantage に退避</span>}
          </div>
          <p className={clsx("mt-1 text-[11px]", isTokyoMarketOpen ? "text-warning" : "text-text-muted")}>
            {marketGuidanceText}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {TIMEFRAME_OPTIONS.map((option) => {
            const isActive = timeframe === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTimeframe(option.value)}
                className={clsx("cyber-btn whitespace-nowrap px-2.5 py-1 text-[10px]", isActive && "active")}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="flex h-[300px] flex-col items-center justify-center gap-3 md:h-[400px]">
          <div className="text-center">
            <p className="font-mono tabular-nums text-sm text-danger">⚠ エラーが発生しました</p>
            <p className="mt-1 font-mono tabular-nums text-xs text-text-muted">{error}</p>
          </div>
          <button type="button" onClick={refetch} className="cyber-btn px-4 py-1.5 text-[10px]">
            再試行
          </button>
        </div>
      ) : loading && ohlc.length === 0 ? (
        <div className="relative h-[300px] overflow-hidden md:h-[400px]">
          <div className="absolute inset-0 animate-pulse-soft rounded bg-panel-elevated/40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin-slow text-positive/50" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="30 70" />
              </svg>
              <span className="font-mono tabular-nums text-xs uppercase tracking-wider text-text-muted">
                Loading chart data...
              </span>
            </div>
          </div>
          <div className="absolute inset-x-0 top-1/4 h-px bg-positive/5" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-positive/5" />
          <div className="absolute inset-x-0 top-3/4 h-px bg-positive/5" />
        </div>
      ) : ohlc.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center md:h-[400px]">
          <p className="font-mono tabular-nums text-sm text-text-muted">データなし</p>
        </div>
      ) : null}

      <div
        ref={containerRef}
        className={clsx("h-[300px] w-full md:h-[400px]", (error || ohlc.length === 0) && "hidden")}
      />

      {loading && ohlc.length > 0 && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="h-1 w-1 animate-pulse-soft rounded-full bg-positive/60" />
          <span className="font-mono tabular-nums text-[9px] uppercase tracking-wider text-text-muted/50">
            Updating...
          </span>
        </div>
      )}
    </section>
  );
}

export function NikkeiCandlestickChart(props: NikkeiCandlestickChartProps): JSX.Element {
  return <CandlestickChartInner {...props} />;
}

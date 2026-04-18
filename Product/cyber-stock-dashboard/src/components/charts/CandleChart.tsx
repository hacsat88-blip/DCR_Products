"use client";

import * as React from "react";
import type { Candle } from "@/lib/providers/types";

export type CandleInterval = "1d" | "1w";

export interface CandleChartProps {
  data: Candle[];
  height?: number;
  defaultInterval?: CandleInterval;
  onIntervalChange?: (interval: CandleInterval) => void;
  upColor?: string;
  downColor?: string;
  showToggle?: boolean;
}

interface CandleSeriesPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface ChartHandle {
  remove: () => void;
  resize?: (w: number, h: number) => void;
}
interface SeriesHandle {
  setData: (d: CandleSeriesPoint[]) => void;
}

const NEON_UP = "#34d399";
const NEON_DOWN = "#FF3B6B";

/** 日足配列を週足にダウンサンプル (ISO 週・月曜起点) */
export function aggregateWeekly(candles: Candle[]): Candle[] {
  if (candles.length === 0) return [];
  const sorted = [...candles].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
  const buckets = new Map<string, Candle[]>();
  for (const c of sorted) {
    const d = new Date(`${c.date}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) continue;
    const day = d.getUTCDay();
    const offset = (day + 6) % 7;
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - offset);
    const key = monday.toISOString().slice(0, 10);
    const arr = buckets.get(key);
    if (arr) arr.push(c);
    else buckets.set(key, [c]);
  }
  const out: Candle[] = [];
  for (const [date, arr] of buckets) {
    arr.sort((a, b) => (a.date < b.date ? -1 : 1));
    const open = arr[0].open;
    const close = arr[arr.length - 1].close;
    let high = arr[0].high;
    let low = arr[0].low;
    let volume = 0;
    for (const c of arr) {
      if (c.high > high) high = c.high;
      if (c.low < low) low = c.low;
      volume += c.volume;
    }
    out.push({ date, open, high, low, close, volume });
  }
  out.sort((a, b) => (a.date < b.date ? -1 : 1));
  return out;
}

export function CandleChart({
  data,
  height = 320,
  defaultInterval = "1d",
  onIntervalChange,
  upColor = NEON_UP,
  downColor = NEON_DOWN,
  showToggle = true,
}: CandleChartProps) {
  const [interval, setIntervalState] =
    React.useState<CandleInterval>(defaultInterval);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const seriesData = React.useMemo<CandleSeriesPoint[]>(() => {
    const src = interval === "1w" ? aggregateWeekly(data) : data;
    return src.map((c) => ({
      time: c.date,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
  }, [data, interval]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let disposed = false;
    let chart: ChartHandle | null = null;
    let series: SeriesHandle | null = null;
    let ro: ResizeObserver | null = null;

    (async () => {
      try {
        const lwc = (await import("lightweight-charts")) as unknown as {
          createChart: (
            el: HTMLElement,
            opts?: Record<string, unknown>,
          ) => ChartHandle & {
            addCandlestickSeries?: (
              opts?: Record<string, unknown>,
            ) => SeriesHandle;
            addSeries?: (
              ctor: unknown,
              opts?: Record<string, unknown>,
            ) => SeriesHandle;
            timeScale?: () => { fitContent?: () => void };
          };
          CandlestickSeries?: unknown;
        };
        if (disposed) return;
        const c = lwc.createChart(el, {
          height,
          width: el.clientWidth || 600,
          layout: {
            background: { color: "transparent" },
            textColor: "rgba(244,250,255,0.7)",
            fontSize: 11,
          },
          grid: {
            vertLines: { color: "rgba(0,225,255,0.06)" },
            horzLines: { color: "rgba(0,225,255,0.06)" },
          },
          rightPriceScale: { borderColor: "rgba(0,225,255,0.25)" },
          timeScale: {
            borderColor: "rgba(0,225,255,0.25)",
            timeVisible: false,
          },
        });
        chart = c;
        const seriesOpts = {
          upColor,
          downColor,
          borderUpColor: upColor,
          borderDownColor: downColor,
          wickUpColor: upColor,
          wickDownColor: downColor,
        };
        const created =
          typeof c.addCandlestickSeries === "function"
            ? c.addCandlestickSeries(seriesOpts)
            : c.addSeries
              ? c.addSeries(lwc.CandlestickSeries, seriesOpts)
              : null;
        if (!created) return;
        series = created;
        series.setData(seriesData);
        try {
          c.timeScale?.()?.fitContent?.();
        } catch {
          // noop
        }

        if (typeof ResizeObserver !== "undefined") {
          ro = new ResizeObserver(() => {
            if (chart && el && typeof chart.resize === "function") {
              chart.resize(el.clientWidth, height);
            }
          });
          ro.observe(el);
        }
      } catch (e) {
        console.warn("[CandleChart] load failed", e);
      }
    })();

    return () => {
      disposed = true;
      ro?.disconnect();
      try {
        chart?.remove();
      } catch {
        // noop
      }
      // suppress unused warnings
      void series;
    };
  }, [seriesData, height, upColor, downColor]);

  const setIntervalSafe = React.useCallback(
    (i: CandleInterval) => {
      setIntervalState(i);
      onIntervalChange?.(i);
    },
    [onIntervalChange],
  );

  return (
    <div className="flex flex-col gap-2" data-testid="candle-chart">
      {showToggle && (
        <div
          role="tablist"
          aria-label="ローソク足インターバル"
          className="flex justify-end gap-2"
        >
          {(["1d", "1w"] as CandleInterval[]).map((i) => {
            const active = i === interval;
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setIntervalSafe(i)}
                className={
                  "h-7 rounded-lg border px-3 text-[11px] uppercase tracking-wider transition-all " +
                  (active
                    ? "border-neon/70 bg-neon/15 text-neon shadow-[0_0_12px_rgba(0,225,255,0.4)]"
                    : "border-text/20 text-text/60 hover:border-neon/50 hover:text-neon")
                }
              >
                {i === "1d" ? "日足" : "週足"}
              </button>
            );
          })}
        </div>
      )}
      <div
        ref={containerRef}
        data-testid="candle-chart-container"
        data-interval={interval}
        data-empty={seriesData.length === 0}
        style={{ height, width: "100%" }}
      >
        {seriesData.length === 0 && (
          <div className="flex h-full w-full items-center justify-center text-[11px] uppercase tracking-widest text-text/40">
            NO DATA
          </div>
        )}
      </div>
    </div>
  );
}

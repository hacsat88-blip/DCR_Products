"use client";

import * as React from "react";
import type { Candle } from "@/lib/providers/types";

export interface IndexChartProps {
  data: Candle[];
  height?: number;
  color?: string;
}

/**
 * lightweight-charts は client-only。SSR 中は空 div を返し、
 * mount 後に動的 import してチャートを生成する。
 */
export function IndexChart({
  data,
  height = 120,
  color = "#00E1FF",
}: IndexChartProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let disposed = false;
    type ChartHandle = { remove: () => void; resize?: (w: number, h: number) => void };
    let chart: ChartHandle | null = null;
    let ro: ResizeObserver | null = null;

    (async () => {
      try {
        const lwc = (await import("lightweight-charts")) as unknown as {
          createChart: (
            el: HTMLElement,
            opts?: Record<string, unknown>,
          ) => ChartHandle & {
            addLineSeries?: (opts?: Record<string, unknown>) => {
              setData: (d: { time: string; value: number }[]) => void;
            };
            addSeries?: (
              ctor: unknown,
              opts?: Record<string, unknown>,
            ) => {
              setData: (d: { time: string; value: number }[]) => void;
            };
          };
          LineSeries?: unknown;
        };
        if (disposed) return;
        const c = lwc.createChart(el, {
          height,
          width: el.clientWidth,
          layout: {
            background: { color: "transparent" },
            textColor: "rgba(244,250,255,0.6)",
            fontSize: 10,
          },
          grid: {
            vertLines: { color: "rgba(0,225,255,0.05)" },
            horzLines: { color: "rgba(0,225,255,0.05)" },
          },
          rightPriceScale: { borderColor: "rgba(0,225,255,0.2)" },
          timeScale: {
            borderColor: "rgba(0,225,255,0.2)",
            barSpacing: 4,
          },
          handleScroll: false,
          handleScale: false,
        });
        chart = c;
        const series =
          typeof c.addLineSeries === "function"
            ? c.addLineSeries({
                color,
                lineWidth: 2,
                priceLineVisible: false,
                lastValueVisible: false,
              })
            : c.addSeries
              ? c.addSeries(lwc.LineSeries, {
                  color,
                  lineWidth: 2,
                  priceLineVisible: false,
                  lastValueVisible: false,
                })
              : null;
        if (!series) return;
        series.setData(
          data.map((d) => ({ time: d.date, value: d.close })),
        );

        if (typeof ResizeObserver !== "undefined") {
          ro = new ResizeObserver(() => {
            if (chart && el && typeof chart.resize === "function") {
              chart.resize(el.clientWidth, height);
            }
          });
          ro.observe(el);
        }
      } catch (e) {
        console.warn("[IndexChart] load failed", e);
      }
    })();

    return () => {
      disposed = true;
      ro?.disconnect();
      chart?.remove();
    };
  }, [data, height, color]);

  return <div ref={containerRef} style={{ height, width: "100%" }} />;
}

"use client";

import * as React from "react";
import type { SparklinePoint } from "./types";

export interface SparklineProps {
  data?: SparklinePoint[];
  height?: number;
  color?: string;
}

const NEON = "#00E1FF";

export function Sparkline({
  data,
  height = 60,
  color = NEON,
}: SparklineProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || !data || data.length < 2) return;
    if (typeof window === "undefined") return;

    let disposed = false;
    let chart: { remove: () => void } | null = null;

    (async () => {
      const lib = await import("lightweight-charts");
      if (disposed || !containerRef.current) return;

      const created = lib.createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height,
        layout: {
          background: { type: lib.ColorType.Solid, color: "rgba(0,0,0,0)" },
          textColor: "rgba(0,0,0,0)",
          attributionLogo: false,
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { visible: false },
        },
        rightPriceScale: { visible: false },
        leftPriceScale: { visible: false },
        timeScale: { visible: false, borderVisible: false },
        crosshair: {
          horzLine: { visible: false },
          vertLine: { visible: false },
        },
        handleScale: false,
        handleScroll: false,
      });

      const series = created.addSeries(lib.LineSeries, {
        color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });

      series.setData(
        data.map((d) => ({
          time: d.time as unknown as never,
          value: d.value,
        })),
      );
      created.timeScale().fitContent();

      chart = created as unknown as typeof chart;
    })().catch(() => {
      // ignore — placeholder fallback handles rendering
    });

    return () => {
      disposed = true;
      try {
        chart?.remove();
      } catch {
        // noop
      }
    };
  }, [data, height, color]);

  const hasData = !!data && data.length >= 2;

  return (
    <div
      ref={containerRef}
      data-testid="sparkline"
      data-empty={!hasData}
      style={{ width: "100%", height }}
      className="relative overflow-hidden"
    >
      {!hasData && (
        <div className="flex h-full w-full items-center justify-center text-[10px] tracking-widest text-text/40 uppercase">
          NO DATA
        </div>
      )}
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, ISeriesApi, LineStyle, Time } from "lightweight-charts";

interface PricePoint {
  timestamp: string;
  price: number;
  volume: number;
}

interface SignalMark {
  timestamp: string;
  action: string;
  price: number;
}

interface Props {
  symbol: string;
  signals?: SignalMark[];
}

export default function PriceChart({ symbol, signals = [] }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#111827" }, textColor: "#d1d5db" },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      width: containerRef.current.clientWidth,
      height: 240,
      timeScale: { timeVisible: true, secondsVisible: false },
    });
    const series = chart.addLineSeries({
      color: "#60a5fa",
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
    });
    chartRef.current = chart;
    seriesRef.current = series;

    const handle = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handle);

    return () => {
      window.removeEventListener("resize", handle);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    fetch(`/api/history/${symbol}?limit=200`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !seriesRef.current) return;
        const points: PricePoint[] = data.points ?? [];
        seriesRef.current.setData(
          points.map((p) => ({
            time: (new Date(p.timestamp).getTime() / 1000) as Time,
            value: p.price,
          })),
        );
        if (signals.length > 0) {
          seriesRef.current.setMarkers(
            signals.map((s) => ({
              time: (new Date(s.timestamp).getTime() / 1000) as Time,
              position: s.action === "buy" ? "belowBar" : "aboveBar",
              color: s.action === "buy" ? "#22c55e" : "#ef4444",
              shape: s.action === "buy" ? "arrowUp" : "arrowDown",
              text: s.action === "buy" ? "B" : "S",
            })),
          );
        }
      })
      .catch((e) => setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [symbol, signals]);

  return (
    <div className="bg-gray-900 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm text-gray-400">価格チャート — {symbol || "—"}</h2>
        {error && <span className="text-red-400 text-xs">{error}</span>}
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}

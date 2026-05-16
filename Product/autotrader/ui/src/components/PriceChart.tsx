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

function generateMockHistory(symbol: string): PricePoint[] {
  const basePrice = symbol === "9984" ? 68000 : symbol === "6758" ? 12500 : symbol === "8306" ? 580 : 2450;
  const points: PricePoint[] = [];
  const now = new Date();
  now.setHours(9, 0, 0, 0);
  for (let i = 0; i < 60; i++) {
    const t = new Date(now.getTime() + i * 5 * 60 * 1000);
    const noise = (Math.random() - 0.5) * basePrice * 0.02;
    const trend = Math.sin(i / 10) * basePrice * 0.01;
    points.push({
      timestamp: t.toISOString(),
      price: Math.round(basePrice + trend + noise),
      volume: Math.floor(Math.random() * 10000) + 5000,
    });
  }
  return points;
}

export default function PriceChart({ symbol, signals = [] }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#0B0F17" }, textColor: "#9ca3af" },
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

  // 銘柄変更時: 価格データをフェッチ（signals に依存しないため再フェッチを抑制）
  useEffect(() => {
    if (!symbol) return;
    setError(null);
    // 銘柄切替時に前の銘柄のマーカーをクリア
    seriesRef.current?.setMarkers([]);

    let cancelled = false;
    fetch(`/api/history/${symbol}?limit=200`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const text = await r.text();
        try {
          return JSON.parse(text);
        } catch {
          throw new Error("Invalid JSON response");
        }
      })
      .then((data) => {
        if (cancelled || !seriesRef.current) return;
        const points: PricePoint[] = data.points ?? [];
        const src = points.length > 0 ? points : generateMockHistory(symbol);
        seriesRef.current.setData(
          src.map((p) => ({
            time: (new Date(p.timestamp).getTime() / 1000) as Time,
            value: p.price,
          })),
        );
      })
      .catch((e) => {
        if (cancelled) return;
        if (seriesRef.current) {
          seriesRef.current.setData(
            generateMockHistory(symbol).map((p) => ({
              time: (new Date(p.timestamp).getTime() / 1000) as Time,
              value: p.price,
            })),
          );
        }
        setError(`API接続エラー: ${String(e)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // シグナル変更時: データロードとは独立してマーカーを更新
  useEffect(() => {
    if (!seriesRef.current) return;
    if (signals.length === 0) {
      seriesRef.current.setMarkers([]);
      return;
    }
    // lightweight-charts はマーカーを時刻昇順で要求する
    const sorted = [...signals].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    seriesRef.current.setMarkers(
      sorted.map((s) => ({
        time: (new Date(s.timestamp).getTime() / 1000) as Time,
        position: s.action === "buy" ? "belowBar" : "aboveBar",
        color: s.action === "buy" ? "#22c55e" : "#ef4444",
        shape: s.action === "buy" ? "arrowUp" : "arrowDown",
        text: s.action === "buy" ? "B" : "S",
      })),
    );
  }, [signals]);

  return (
    <div>
      {error && (
        <span className="text-red-400 text-xs block mb-1">{error}</span>
      )}
      <div ref={containerRef} className="w-full" />
    </div>
  );
}

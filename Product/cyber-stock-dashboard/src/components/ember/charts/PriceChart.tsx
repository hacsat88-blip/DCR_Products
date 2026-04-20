"use client";

import { useState, useEffect, useRef, useMemo, useId } from "react";

export type Candle = {
  t: number; // Unix timestamp (ms)
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type PriceChartProps = {
  candles: Candle[];
  mode?: "line" | "area" | "candle";
  height?: number;
  showCrosshair?: boolean;
  onHover?: (candle: Candle | null) => void;
  accent?: string;
};

function fmtShort(t: number): string {
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function fmtFull(t: number): string {
  const d = new Date(t);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export function PriceChart({
  candles,
  mode = "area",
  height = 320,
  showCrosshair = true,
  onHover,
  accent = "var(--coral)",
}: PriceChartProps) {
  const uid = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    setWidth(el.clientWidth || 600);
    return () => ro.disconnect();
  }, []);

  const PAD = { l: 8, r: 62, t: 16, b: 28 } as const;
  const innerW = Math.max(1, width - PAD.l - PAD.r);
  const innerH = Math.max(1, height - PAD.t - PAD.b);

  const derived = useMemo(() => {
    if (!candles.length) return null;
    const mn = Math.min(...candles.map((c) => c.l)) * 0.998;
    const mx = Math.max(...candles.map((c) => c.h)) * 1.002;
    const yS = (v: number) =>
      PAD.t + innerH - ((v - mn) / (mx - mn)) * innerH;
    const xS = (i: number) =>
      PAD.l + (i / Math.max(1, candles.length - 1)) * innerW;
    const linePts = candles.map((c, i) => [xS(i), yS(c.c)]);
    const line = "M " + linePts.map((p) => p.join(",")).join(" L ");
    const area =
      line +
      ` L ${xS(candles.length - 1)},${PAD.t + innerH} L ${PAD.l},${PAD.t + innerH} Z`;
    const yTicks = Array.from(
      { length: 4 },
      (_, i) => mn + ((mx - mn) * (i + 0.5)) / 4
    );
    const xIdxs = Array.from({ length: 6 }, (_, i) =>
      Math.round((i / 5) * (candles.length - 1))
    );
    return { mn, mx, yS, xS, line, area, yTicks, xIdxs };
  }, [candles, innerW, innerH]);

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!derived || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const i = Math.max(
      0,
      Math.min(
        candles.length - 1,
        Math.round(((rawX - PAD.l) / innerW) * (candles.length - 1))
      )
    );
    setHoverIdx(i);
    onHover?.(candles[i]);
  };

  const handlePointerLeave = () => {
    setHoverIdx(null);
    onHover?.(null);
  };

  if (!candles.length || !derived) {
    return (
      <div
        ref={containerRef}
        style={{
          height,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          className="text-ink-mute"
          style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 28 }}
        >
          —
        </span>
      </div>
    );
  }

  const { yS, xS, line, area, yTicks, xIdxs } = derived;
  const lastClose = candles[candles.length - 1].c;
  const lastY = yS(lastClose);
  const tipCandle = hoverIdx != null ? candles[hoverIdx] : null;
  const tipX = hoverIdx != null ? xS(hoverIdx) : 0;
  const prevClose =
    hoverIdx != null && hoverIdx > 0 ? candles[hoverIdx - 1].c : null;
  const pctChange =
    tipCandle && prevClose != null
      ? ((tipCandle.c - prevClose) / prevClose) * 100
      : null;

  const gradId = `${uid}g`;
  const clipId = `${uid}c`;

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height }}
    >
      <svg
        width={width}
        height={height}
        style={{ display: "block", userSelect: "none" }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.25}>
              <animate attributeName="stop-opacity" values="0.18;0.25;0.18" dur="4s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
          </linearGradient>
          <clipPath id={clipId}>
            <rect x={PAD.l} y={PAD.t} width={innerW} height={innerH} />
          </clipPath>
        </defs>

        {/* Horizontal grid at 4 quartile levels */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.l}
              x2={PAD.l + innerW}
              y1={yS(v)}
              y2={yS(v)}
              stroke="var(--ink)"
              strokeOpacity={0.12}
              strokeDasharray="2 4"
            />
            <text
              x={PAD.l + innerW + 6}
              y={yS(v)}
              dominantBaseline="middle"
              fontSize="10"
              fill="var(--ink-mute)"
              style={{ fontFamily: "var(--font-mono, monospace)" }}
            >
              {v.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </text>
          </g>
        ))}

        {/* X-axis date labels (~6) */}
        {xIdxs.map((idx, i) => (
          <text
            key={i}
            x={xS(idx)}
            y={height - 6}
            textAnchor="middle"
            fontSize="10"
            fill="var(--ink-mute)"
            style={{ fontFamily: "var(--font-mono, monospace)" }}
          >
            {fmtShort(candles[idx].t)}
          </text>
        ))}

        {/* Series */}
        {mode === "candle" ? (
          <g clipPath={`url(#${clipId})`}>
            {candles.map((c, i) => {
              const x = xS(i);
              const cw = Math.max(2, (innerW / candles.length) * 0.65);
              const bull = c.c >= c.o;
              const cc = bull ? "var(--up)" : "var(--down)";
              const bodyTop = yS(Math.max(c.o, c.c));
              const bodyH = Math.max(1, Math.abs(yS(c.o) - yS(c.c)));
              return (
                <g key={i}>
                  <line
                    x1={x}
                    x2={x}
                    y1={yS(c.h)}
                    y2={yS(c.l)}
                    stroke={cc}
                    strokeWidth="1"
                  />
                  <rect
                    x={x - cw / 2}
                    y={bodyTop}
                    width={cw}
                    height={bodyH}
                    fill={cc}
                    opacity={bull ? 0.85 : 0.95}
                  />
                </g>
              );
            })}
          </g>
        ) : mode === "area" ? (
          <g clipPath={`url(#${clipId})`}>
            <path d={area} fill={`url(#${gradId})`} />
            <path
              d={line}
              fill="none"
              stroke={accent}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        ) : (
          <g clipPath={`url(#${clipId})`}>
            <path
              d={line}
              fill="none"
              stroke={accent}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* Last price marker */}
        <circle
          cx={xS(candles.length - 1)}
          cy={lastY}
          r={4}
          fill={accent}
          stroke="var(--surface)"
          strokeWidth="2"
        />
        <rect
          x={PAD.l + innerW + 3}
          y={lastY - 9}
          width={56}
          height={18}
          rx={4}
          fill={accent}
        />
        <text
          x={PAD.l + innerW + 31}
          y={lastY + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="10"
          fontWeight="600"
          fill="white"
          style={{ fontFamily: "var(--font-mono, monospace)" }}
        >
          {Math.round(lastClose).toLocaleString()}
        </text>

        {/* Crosshair */}
        {showCrosshair && hoverIdx != null && tipCandle && (
          <g style={{ pointerEvents: "none" }}>
            <line
              x1={tipX}
              x2={tipX}
              y1={PAD.t}
              y2={PAD.t + innerH}
              stroke="var(--ink)"
              strokeOpacity={0.25}
              strokeDasharray="3 3"
            />
            <line
              x1={PAD.l}
              x2={PAD.l + innerW}
              y1={yS(tipCandle.c)}
              y2={yS(tipCandle.c)}
              stroke="var(--ink)"
              strokeOpacity={0.15}
              strokeDasharray="3 3"
            />
            <circle
              cx={tipX}
              cy={yS(tipCandle.c)}
              r={5}
              fill={accent}
              stroke="var(--surface)"
              strokeWidth="2"
            />
            {/* Floating tooltip */}
            {(() => {
              const ty = yS(tipCandle.c);
              const tooltipX = tipX > width * 0.7 ? tipX - 120 : tipX + 12;
              const tooltipY = Math.max(PAD.t + 4, Math.min(ty - 28, height - PAD.b - 60));
              return (
                <g>
                  <rect x={tooltipX} y={tooltipY} width={110} height={52} rx={6}
                    fill="var(--surface)" stroke="var(--border)" strokeWidth={1} opacity={0.95} />
                  <text x={tooltipX + 8} y={tooltipY + 16} fill="var(--ink-mute)" style={{ fontSize: 10 }}>
                    {fmtFull(tipCandle.t)}
                  </text>
                  <text x={tooltipX + 8} y={tooltipY + 32} fill="var(--ink)" style={{ fontSize: 13, fontWeight: 600 }}>
                    {tipCandle.c.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </text>
                  <text x={tooltipX + 8} y={tooltipY + 46} fill={tipCandle.c >= tipCandle.o ? 'var(--up)' : 'var(--down)'} style={{ fontSize: 10 }}>
                    {tipCandle.c >= tipCandle.o ? '▲' : '▼'} {((tipCandle.c - tipCandle.o) / tipCandle.o * 100).toFixed(2)}%
                  </text>
                </g>
              );
            })()}
          </g>
        )}
      </svg>

      {/* Tooltip card */}
      {showCrosshair && tipCandle && (
        <div
          style={{
            position: "absolute",
            left: Math.min(width - 178, Math.max(8, tipX + 14)),
            top: 8,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 12,
            minWidth: 164,
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono, monospace)",
              color: "var(--ink-mute)",
              fontSize: 10,
              marginBottom: 6,
            }}
          >
            {fmtFull(tipCandle.t)}
          </div>
          {(
            [
              ["始値", tipCandle.o],
              ["高値", tipCandle.h],
              ["安値", tipCandle.l],
              ["終値", tipCandle.c],
            ] as [string, number][]
          ).map(([lbl, val]) => (
            <div
              key={lbl}
              style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
            >
              <span style={{ color: "var(--ink-mute)" }}>{lbl}</span>
              <span
                style={{
                  color: "var(--ink)",
                  fontWeight: 600,
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {val.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </span>
            </div>
          ))}
          {pctChange != null && (
            <div
              style={{
                marginTop: 6,
                paddingTop: 6,
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ color: "var(--ink-mute)" }}>前日比</span>
              <span
                style={{
                  color: pctChange >= 0 ? "var(--up)" : "var(--down)",
                  fontWeight: 600,
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {pctChange >= 0 ? "+" : ""}
                {pctChange.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

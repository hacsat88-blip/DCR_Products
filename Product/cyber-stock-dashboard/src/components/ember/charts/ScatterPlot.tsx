"use client";

import { useState, useEffect, useRef, useMemo, useId } from "react";

export type ScatterPoint = {
  id: string;
  label: string;
  sector: string;
  x: number;
  y: number;
  size: number;
  total: number;
};

export type ScatterPlotProps = {
  points: ScatterPoint[];
  xAxis: { id: string; label: string; min?: number; max?: number };
  yAxis: { id: string; label: string; min?: number; max?: number };
  height?: number;
  onPointHover?: (point: ScatterPoint | null) => void;
  onPointClick?: (point: ScatterPoint) => void;
};

const SECTOR_COLORS: Record<string, string> = {
  technology: "var(--coral)",
  finance: "var(--plum)",
  energy: "var(--clay)",
  healthcare: "var(--sage)",
  consumer: "var(--moss)",
  communication: "var(--coral-deep)",
};

function sectorColor(sector: string): string {
  return SECTOR_COLORS[sector.toLowerCase()] ?? "var(--ink-mute)";
}

const GRID_N = 5;

export function ScatterPlot({
  points,
  xAxis,
  yAxis,
  height = 360,
  onPointHover,
  onPointClick,
}: ScatterPlotProps) {
  const uid = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(500);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    setWidth(el.clientWidth || 500);
    return () => ro.disconnect();
  }, []);

  const PAD = { l: 52, r: 20, t: 28, b: 44 } as const;
  const innerW = Math.max(1, width - PAD.l - PAD.r);
  const innerH = Math.max(1, height - PAD.t - PAD.b);

  const domain = useMemo(() => {
    if (!points.length) return { xMin: 0, xMax: 1, yMin: 0, yMax: 1, sizeMax: 1 };
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const ss = points.map((p) => p.size);
    return {
      xMin: xAxis.min ?? Math.min(...xs),
      xMax: xAxis.max ?? Math.max(...xs),
      yMin: yAxis.min ?? Math.min(...ys),
      yMax: yAxis.max ?? Math.max(...ys),
      sizeMax: Math.max(1, ...ss),
    };
  }, [points, xAxis.min, xAxis.max, yAxis.min, yAxis.max]);

  const xS = (v: number) =>
    PAD.l + ((v - domain.xMin) / (domain.xMax - domain.xMin || 1)) * innerW;
  const yS = (v: number) =>
    PAD.t + innerH - ((v - domain.yMin) / (domain.yMax - domain.yMin || 1)) * innerH;
  const ptR = (sz: number) =>
    Math.max(4, (Math.sqrt(sz) / Math.sqrt(domain.sizeMax)) * 18);

  const xGridVals = Array.from(
    { length: GRID_N },
    (_, i) => domain.xMin + ((domain.xMax - domain.xMin) * i) / (GRID_N - 1)
  );
  const yGridVals = Array.from(
    { length: GRID_N },
    (_, i) => domain.yMin + ((domain.yMax - domain.yMin) * i) / (GRID_N - 1)
  );

  const hoveredPoint =
    hoverId != null ? (points.find((p) => p.id === hoverId) ?? null) : null;

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handlePointerLeave = () => {
    setCursor(null);
    setHoverId(null);
    onPointHover?.(null);
  };

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
          <clipPath id={`${uid}clip`}>
            <rect x={PAD.l} y={PAD.t} width={innerW} height={innerH} />
          </clipPath>
        </defs>

        {/* 5×5 dashed grid */}
        {xGridVals.map((v, i) => (
          <line
            key={`xg${i}`}
            x1={xS(v)}
            x2={xS(v)}
            y1={PAD.t}
            y2={PAD.t + innerH}
            stroke="var(--border)"
            strokeOpacity={0.5}
            strokeDasharray="2 4"
          />
        ))}
        {yGridVals.map((v, i) => (
          <line
            key={`yg${i}`}
            x1={PAD.l}
            x2={PAD.l + innerW}
            y1={yS(v)}
            y2={yS(v)}
            stroke="var(--border)"
            strokeOpacity={0.5}
            strokeDasharray="2 4"
          />
        ))}

        {/* Axis tick labels */}
        {xGridVals.map((v, i) => (
          <text
            key={`xl${i}`}
            x={xS(v)}
            y={PAD.t + innerH + 14}
            textAnchor="middle"
            fontSize="9"
            fill="var(--ink-mute)"
            style={{ fontFamily: "var(--font-mono, monospace)" }}
          >
            {v.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </text>
        ))}
        {yGridVals.map((v, i) => (
          <text
            key={`yl${i}`}
            x={PAD.l - 6}
            y={yS(v)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize="9"
            fill="var(--ink-mute)"
            style={{ fontFamily: "var(--font-mono, monospace)" }}
          >
            {v.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </text>
        ))}

        {/* Y-axis label — top-left, serif */}
        <text
          x={PAD.l}
          y={PAD.t - 10}
          fontSize="11"
          fill="var(--ink-soft)"
          style={{ fontFamily: "var(--font-display, Georgia, serif)" }}
        >
          {yAxis.label}
        </text>

        {/* X-axis label — bottom-right, serif */}
        <text
          x={PAD.l + innerW}
          y={PAD.t + innerH + 38}
          textAnchor="end"
          fontSize="11"
          fill="var(--ink-soft)"
          style={{ fontFamily: "var(--font-display, Georgia, serif)" }}
        >
          {xAxis.label}
        </text>

        {/* Points */}
        <g clipPath={`url(#${uid}clip)`}>
          {points.map((p) => {
            const px = xS(p.x);
            const py = yS(p.y);
            const r = ptR(p.size);
            const isHovered = hoverId === p.id;
            const color = sectorColor(p.sector);
            return (
              <g
                key={p.id}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => {
                  setHoverId(p.id);
                  onPointHover?.(p);
                }}
                onMouseLeave={() => {
                  setHoverId(null);
                  onPointHover?.(null);
                }}
                onClick={() => onPointClick?.(p)}
              >
                {isHovered && (
                  <circle
                    cx={px}
                    cy={py}
                    r={r + 5}
                    fill="none"
                    stroke={color}
                    strokeOpacity={0.4}
                    strokeWidth="1.5"
                    style={{ pointerEvents: "none" }}
                  />
                )}
                <circle
                  cx={px}
                  cy={py}
                  r={r}
                  fill={color}
                  opacity={hoverId == null || isHovered ? 0.82 : 0.28}
                  style={{ transition: "opacity 0.18s" }}
                />
              </g>
            );
          })}
        </g>
      </svg>

      {/* Hover tooltip */}
      {hoveredPoint && cursor && (
        <div
          style={{
            position: "absolute",
            left: Math.min(width - 178, cursor.x + 14),
            top: Math.max(4, cursor.y - 68),
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            minWidth: 154,
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>
            {hoveredPoint.label}
          </div>
          <div
            style={{
              color: "var(--ink-mute)",
              fontSize: 10,
              marginBottom: 6,
              textTransform: "capitalize",
            }}
          >
            {hoveredPoint.sector}
          </div>
          {(
            [
              [xAxis.label, hoveredPoint.x],
              [yAxis.label, hoveredPoint.y],
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
                {val.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
          <div
            style={{
              marginTop: 4,
              paddingTop: 4,
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span style={{ color: "var(--ink-mute)" }}>Total</span>
            <span
              style={{
                color: "var(--ink)",
                fontWeight: 600,
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {hoveredPoint.total.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

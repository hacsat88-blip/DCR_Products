"use client";

import { useMemo, useId } from "react";

export type SparklineProps = {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
};

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = "var(--coral)",
  strokeWidth = 1.5,
}: SparklineProps) {
  const uid = useId().replace(/:/g, "");

  const paths = useMemo(() => {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => [
      (i / (data.length - 1)) * width,
      height - ((v - min) / range) * (height - 4) - 2,
    ]);
    const line = "M " + pts.map((p) => p.join(",")).join(" L ");
    const area = `${line} L ${width},${height} L 0,${height} Z`;
    return { line, area };
  }, [data, width, height]);

  if (!paths) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.32} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={paths.area} fill={`url(#${uid})`} />
      <path
        d={paths.line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

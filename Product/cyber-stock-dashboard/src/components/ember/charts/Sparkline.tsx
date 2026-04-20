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
    return { line, area, pts };
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
        <linearGradient id={`${uid}-stroke`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={1} />
        </linearGradient>
      </defs>
      <path d={paths.area} fill={`url(#${uid})`} />
      <path
        d={paths.line}
        fill="none"
        stroke={`url(#${uid}-stroke)`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={paths.pts[paths.pts.length - 1][0]}
        cy={paths.pts[paths.pts.length - 1][1]}
        r={2}
        fill={color}
      />
    </svg>
  );
}

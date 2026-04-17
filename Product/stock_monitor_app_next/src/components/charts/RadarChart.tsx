"use client";

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadarChart,
} from "recharts";
import clsx from "clsx";

export interface RadarAxis {
  key: string;
  label: string;
}

export interface ScoreRadarProps {
  axes?: readonly RadarAxis[];
  values: Record<string, number>;
  compareValues?: Record<string, number>;
  highlightColor?: string;
  compareColor?: string;
  size?: number;
  className?: string;
}

const DEFAULT_AXES: readonly RadarAxis[] = [
  { key: "growth", label: "成長性" },
  { key: "value", label: "割安性" },
  { key: "profit", label: "収益性" },
  { key: "safety", label: "財務安全性" },
  { key: "momentum", label: "モメンタム" },
];

function clamp(v: number | undefined): number {
  if (typeof v !== "number" || Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

export function ScoreRadar({
  axes = DEFAULT_AXES,
  values,
  compareValues,
  highlightColor = "var(--inp-accent, #00D9FF)",
  compareColor = "var(--inp-warning, #F6C343)",
  size = 280,
  className,
}: ScoreRadarProps): JSX.Element {
  const data = axes.map((axis) => {
    const row: Record<string, string | number> = {
      axis: axis.label,
      main: clamp(values[axis.key]),
    };
    if (compareValues) {
      row.compare = clamp(compareValues[axis.key]);
    }
    return row;
  });

  return (
    <div
      role="img"
      aria-label="スコアレーダーチャート"
      className={clsx("inp-radar", className)}
      style={{ width: size, height: size }}
    >
      <RechartsRadarChart width={size} height={size} data={data} outerRadius="75%">
        <PolarGrid stroke="var(--inp-chart-grid)" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: "var(--inp-text-secondary)", fontSize: 12 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={false}
          axisLine={false}
        />
        <Radar
          name="メイン"
          dataKey="main"
          stroke={highlightColor}
          fill={highlightColor}
          fillOpacity={0.32}
          isAnimationActive={false}
        />
        {compareValues ? (
          <Radar
            name="比較"
            dataKey="compare"
            stroke={compareColor}
            fill={compareColor}
            fillOpacity={0.2}
            isAnimationActive={false}
          />
        ) : null}
        {compareValues ? (
          <Legend
            wrapperStyle={{ color: "var(--inp-text-secondary)", fontSize: 12 }}
          />
        ) : null}
      </RechartsRadarChart>
    </div>
  );
}

export default ScoreRadar;

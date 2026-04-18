"use client";

import * as React from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { RADAR_AXIS_LABELS, type RadarScores } from "./types";

export interface RadarScoreProps {
  scores: RadarScores;
  height?: number;
  color?: string;
}

const NEON = "#00E1FF";

export function RadarScore({
  scores,
  height = 200,
  color = NEON,
}: RadarScoreProps) {
  const data = React.useMemo(
    () =>
      (Object.keys(RADAR_AXIS_LABELS) as Array<keyof typeof RADAR_AXIS_LABELS>).map(
        (key) => ({
          axis: RADAR_AXIS_LABELS[key],
          value: Math.max(0, Math.min(100, scores[key] ?? 0)),
        }),
      ),
    [scores],
  );

  return (
    <div
      data-testid="radar-score"
      style={{ width: "100%", height }}
      className="text-neon"
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke={color} strokeOpacity={0.25} />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: color, fontSize: 10, opacity: 0.85 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
            stroke={color}
          />
          <Radar
            name="score"
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.25}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

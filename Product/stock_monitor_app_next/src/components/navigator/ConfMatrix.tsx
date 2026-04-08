"use client";

import type { DebateSignal, DebateVerdict } from "@/types/navigator";

import {
  recommendationStrength,
  resolveDebateConfidence,
} from "./confidence";

interface ConfMatrixProps {
  verdicts: DebateVerdict[];
}

const SIGNAL_COLORS: Record<DebateSignal, string> = {
  go: "#22C55E",
  watch: "#06B6D4",
  out: "#EF4444",
};

const QUADRANTS = [
  { label: "watch", x: 35, y: 28 },
  { label: "core holding", x: 75, y: 28 },
  { label: "exclude", x: 35, y: 72 },
  { label: "pullback wait", x: 75, y: 72 },
] as const;

function confidenceColor(confidence: number): string {
  if (confidence > 80) return "#22C55E";
  if (confidence > 60) return "#06B6D4";
  if (confidence > 40) return "#F59E0B";
  return "#EF4444";
}

export function ConfMatrix({ verdicts }: ConfMatrixProps): JSX.Element {
  const padding = 40;
  const width = 560;
  const height = 360;
  const plotW = width - padding * 2;
  const plotH = height - padding * 2;

  const points = verdicts.map((verdict) => {
    const confidence = resolveDebateConfidence(verdict);
    const strength = recommendationStrength(verdict.signal);
    const x = padding + (confidence / 100) * plotW;
    const y = padding + ((100 - strength) / 100) * plotH;
    return { verdict, confidence, strength, x, y };
  });

  return (
    <div className="rounded-lg border border-glass-border bg-panel-hover p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="font-semibold text-[10px] uppercase tracking-widest text-text-muted">
          CONFIDENCE MATRIX
        </h4>
        <span className="font-mono tabular-nums text-[10px] text-text-muted">
          X: confidence % / Y: recommendation strength
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full min-w-[460px]">
          <defs>
          <linearGradient id="conf-grid" x1="0" x2="1">
            <stop offset="0%" stopColor="#0B0E14" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00D9FF" stopOpacity="0.06" />
          </linearGradient>
          </defs>

        <rect x={padding} y={padding} width={plotW} height={plotH} fill="url(#conf-grid)" />
        <rect
          x={padding}
          y={padding}
          width={plotW}
          height={plotH}
          fill="none"
          stroke="rgba(148,163,184,0.22)"
          strokeWidth="1"
        />

        <line
          x1={padding + plotW / 2}
          y1={padding}
          x2={padding + plotW / 2}
          y2={padding + plotH}
          stroke="rgba(148,163,184,0.22)"
          strokeDasharray="4 4"
        />
        <line
          x1={padding}
          y1={padding + plotH / 2}
          x2={padding + plotW}
          y2={padding + plotH / 2}
          stroke="rgba(148,163,184,0.22)"
          strokeDasharray="4 4"
        />

        {QUADRANTS.map((q) => (
          <text
            key={q.label}
            x={padding + (q.x / 100) * plotW}
            y={padding + (q.y / 100) * plotH}
            fill="rgba(151,174,195,0.75)"
            textAnchor="middle"
            className="font-mono tabular-nums uppercase"
            fontSize="12"
          >
            {q.label}
          </text>
        ))}

        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={`x-${tick}`}>
            <line
              x1={padding + (tick / 100) * plotW}
              y1={padding + plotH}
              x2={padding + (tick / 100) * plotW}
              y2={padding + plotH + 6}
              stroke="rgba(151,174,195,0.8)"
            />
            <text
              x={padding + (tick / 100) * plotW}
              y={padding + plotH + 18}
              fill="rgba(151,174,195,0.8)"
              textAnchor="middle"
              fontSize="10"
              className="font-mono tabular-nums"
            >
              {tick}
            </text>
          </g>
        ))}

        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={padding - 6}
              y1={padding + ((100 - tick) / 100) * plotH}
              x2={padding}
              y2={padding + ((100 - tick) / 100) * plotH}
              stroke="rgba(151,174,195,0.8)"
            />
            <text
              x={padding - 10}
              y={padding + ((100 - tick) / 100) * plotH + 3}
              fill="rgba(151,174,195,0.8)"
              textAnchor="end"
              fontSize="10"
              className="font-mono tabular-nums"
            >
              {tick}
            </text>
          </g>
        ))}

        {points.map(({ verdict, confidence, x, y }) => {
          return (
            <g key={verdict.code}>
              <circle
                cx={x}
                cy={y}
                r={6}
                fill={SIGNAL_COLORS[verdict.signal]}
                stroke="rgba(255,255,255,0.75)"
                strokeWidth="1.2"
              />
              <text
                x={x + 8}
                y={y - 8}
                fill="rgba(247,252,255,0.95)"
                fontSize="11"
                className="font-mono tabular-nums"
              >
                {verdict.code}
              </text>
              <text
                x={x + 8}
                y={y + 5}
                fontSize="10"
                className="font-mono tabular-nums"
                fill={confidenceColor(confidence)}
              >
                {confidence}%
              </text>
            </g>
          );
        })}

        <text
          x={padding + plotW / 2}
          y={height - 8}
          textAnchor="middle"
          fill="rgba(151,174,195,0.9)"
          fontSize="11"
          className="font-mono tabular-nums uppercase"
        >
          confidence %
        </text>
        <text
          x={14}
          y={padding + plotH / 2}
          textAnchor="middle"
          fill="rgba(151,174,195,0.9)"
          fontSize="11"
          className="font-mono tabular-nums uppercase"
          transform={`rotate(-90 14 ${padding + plotH / 2})`}
        >
          recommendation strength
        </text>
        </svg>
      </div>
    </div>
  );
}


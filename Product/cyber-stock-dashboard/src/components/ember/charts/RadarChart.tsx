"use client";

import { useState, useEffect, useRef, useId } from "react";

export type ScoreShape = {
  momentum: number;
  value: number;
  quality: number;
  growth: number;
  sentiment: number;
};

export type RadarChartProps = {
  scores: ScoreShape;
  compareScores?: ScoreShape;
  compareLabel?: string;
  primaryLabel?: string;
  size?: number;
  interactive?: boolean;
  onScoresChange?: (next: ScoreShape) => void;
  onAxisHover?: (axis: string | null) => void;
  animated?: boolean;
  axisLabels?: string[];
};

const AXIS_KEYS: (keyof ScoreShape)[] = [
  "momentum",
  "value",
  "quality",
  "growth",
  "sentiment",
];

const DEFAULT_LABELS = [
  "モメンタム",
  "バリュー",
  "クオリティ",
  "グロース",
  "センチメント",
];

const N = AXIS_KEYS.length;
const RINGS = [25, 50, 75, 100];

function axisAngle(i: number): number {
  return -Math.PI / 2 + (i / N) * Math.PI * 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function RadarChart({
  scores,
  compareScores,
  primaryLabel = "Score",
  size = 360,
  interactive = false,
  onScoresChange,
  onAxisHover,
  animated = true,
  axisLabels,
}: RadarChartProps) {
  const uid = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverAxis, setHoverAxis] = useState<string | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const [rendered, setRendered] = useState<ScoreShape>({
    momentum: 0,
    value: 0,
    quality: 0,
    growth: 0,
    sentiment: 0,
  });
  const renderedRef = useRef<ScoreShape>(rendered);
  const isDragging = useRef(false);

  useEffect(() => {
    if (isDragging.current) return;
    if (!animated) {
      renderedRef.current = scores;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRendered(scores);
      return;
    }
    const start = { ...renderedRef.current };
    const t0 = performance.now();
    const dur = 250;
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = {} as ScoreShape;
      for (const k of AXIS_KEYS) {
        next[k] = lerp(start[k], scores[k], eased);
      }
      renderedRef.current = next;
      setRendered({ ...next });
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    scores.momentum,
    scores.value,
    scores.quality,
    scores.growth,
    scores.sentiment,
    animated,
  ]);

  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.36;

  const pt = (i: number, v: number): [number, number] => {
    const r = (v / 100) * R;
    const a = axisAngle(i);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };

  const toSvgPoints = (s: ScoreShape): string =>
    AXIS_KEYS.map((k, i) => pt(i, s[k]).join(",")).join(" ");

  const ringPoints = (frac: number): string =>
    AXIS_KEYS.map((_, i) => {
      const r = frac * R;
      const a = axisAngle(i);
      return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
    }).join(" ");

  const handleDragMove = (axisIndex: number, e: PointerEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scale = size / rect.width;
    const x = (e.clientX - rect.left) * scale - cx;
    const y = (e.clientY - rect.top) * scale - cy;
    const a = axisAngle(axisIndex);
    const proj = x * Math.cos(a) + y * Math.sin(a);
    const v = Math.max(0, Math.min(100, Math.round((proj / R) * 100)));
    const key = AXIS_KEYS[axisIndex];
    const next: ScoreShape = { ...renderedRef.current, [key]: v };
    renderedRef.current = next;
    setRendered({ ...next });
    onScoresChange?.(next);
  };

  const startDrag = (i: number, e: React.PointerEvent<SVGCircleElement>) => {
    if (!interactive) return;
    e.preventDefault();
    isDragging.current = true;
    setDragging(i);
    const onMove = (ev: PointerEvent) => handleDragMove(i, ev);
    const onUp = () => {
      isDragging.current = false;
      setDragging(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleAxisEnter = (k: string) => {
    setHoverAxis(k);
    onAxisHover?.(k);
  };
  const handleAxisLeave = () => {
    setHoverAxis(null);
    onAxisHover?.(null);
  };

  const totalScore = Math.round(
    AXIS_KEYS.reduce((s, k) => s + rendered[k], 0) / N
  );

  const labels = axisLabels ?? DEFAULT_LABELS;
  const gradFill = `${uid}fill`;
  const gradFill2 = `${uid}fill2`;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${size} ${size}`}
      style={{ width: "100%", height: "auto", overflow: "visible" }}
    >
      <defs>
        <radialGradient id={gradFill} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--coral)" stopOpacity={0.45} />
          <stop offset="100%" stopColor="var(--coral)" stopOpacity={0.08} />
        </radialGradient>
        {compareScores && (
          <radialGradient id={gradFill2} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--plum)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--plum)" stopOpacity={0.05} />
          </radialGradient>
        )}
      </defs>

      {/* Concentric pentagon grid rings at 25 / 50 / 75 / 100 */}
      {RINGS.map((ring, ri) => (
        <polygon
          key={ring}
          points={ringPoints(ring / 100)}
          fill="none"
          stroke="var(--border)"
          strokeOpacity={ri === RINGS.length - 1 ? 0.5 : 0.22}
          strokeWidth="1"
          strokeDasharray={ri === RINGS.length - 1 ? undefined : "2 4"}
        />
      ))}

      {/* Axis spokes */}
      {AXIS_KEYS.map((k, i) => {
        const [x, y] = pt(i, 100);
        const hl = hoverAxis === k;
        return (
          <line
            key={k}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="var(--ink)"
            strokeOpacity={hl ? 0.35 : 0.12}
            strokeWidth={hl ? 1.5 : 1}
          />
        );
      })}

      {/* Compare polygon */}
      {compareScores && (
        <polygon
          points={toSvgPoints(compareScores)}
          fill={`url(#${gradFill2})`}
          stroke="var(--plum)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          opacity={0.7}
        />
      )}

      {/* Primary polygon */}
      <polygon
        points={toSvgPoints(rendered)}
        fill={`url(#${gradFill})`}
        stroke="var(--coral)"
        strokeWidth="2"
      />

      {/* Vertex dots / drag handles */}
      {AXIS_KEYS.map((k, i) => {
        const [x, y] = pt(i, rendered[k]);
        const active = hoverAxis === k || dragging === i;
        return (
          <g key={k}>
            {interactive && active && (
              <circle
                cx={x}
                cy={y}
                r={14}
                fill="none"
                stroke="var(--coral)"
                strokeOpacity={0.35}
                strokeWidth="1"
                style={{ pointerEvents: "none" }}
              />
            )}
            <circle
              cx={x}
              cy={y}
              r={active ? 7 : 4}
              fill="var(--coral-deep)"
              stroke="var(--surface)"
              strokeWidth="2"
              style={{
                cursor: interactive ? "grab" : "default",
                transition: "r 0.12s",
              }}
              onPointerDown={(e) => startDrag(i, e)}
              onMouseEnter={() => handleAxisEnter(k)}
              onMouseLeave={handleAxisLeave}
            />
          </g>
        );
      })}

      {/* Axis labels + current value sub-text */}
      {AXIS_KEYS.map((k, i) => {
        const a = axisAngle(i);
        const dist = R + 28;
        const lx = cx + Math.cos(a) * dist;
        const ly = cy + Math.sin(a) * dist;
        const anchor =
          Math.abs(Math.cos(a)) < 0.28
            ? "middle"
            : Math.cos(a) > 0
            ? "start"
            : "end";
        const hl = hoverAxis === k;
        return (
          <g
            key={`lbl-${k}`}
            onMouseEnter={() => handleAxisEnter(k)}
            onMouseLeave={handleAxisLeave}
            style={{ cursor: "default" }}
          >
            <text
              x={lx}
              y={ly - 6}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize="11"
              fontWeight={hl ? 600 : 500}
              fill={hl ? "var(--coral)" : "var(--ink-soft)"}
              style={{
                fontFamily: "var(--font-ui, sans-serif)",
                letterSpacing: "0.02em",
                transition: "fill 0.15s",
                userSelect: "none",
              }}
            >
              {labels[i] ?? DEFAULT_LABELS[i]}
            </text>
            <text
              x={lx}
              y={ly + 9}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize="10"
              fill="var(--ink-mute)"
              style={{ fontFamily: "var(--font-mono, monospace)" }}
            >
              {Math.round(rendered[k])}
            </text>
          </g>
        );
      })}

      {/* Center: total score (serif, large) + label */}
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={Math.round(size * 0.092)}
        fontWeight="500"
        fill="var(--ink)"
        style={{ fontFamily: "var(--font-display, Georgia, serif)" }}
      >
        {totalScore}
      </text>
      <text
        x={cx}
        y={cy + Math.round(size * 0.065)}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="10"
        fill="var(--ink-mute)"
        style={{
          fontFamily: "var(--font-ui, sans-serif)",
          letterSpacing: "0.06em",
        }}
      >
        {primaryLabel.toUpperCase()}
      </text>
    </svg>
  );
}

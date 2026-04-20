"use client";

import { useState, useMemo, useId } from "react";

export type DonutSlice = {
  id: string;
  label: string;
  value: number;
  color?: string;
};

export type DonutChartProps = {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  onSliceHover?: (id: string | null) => void;
};

const PALETTE = [
  "var(--coral)",
  "var(--clay)",
  "var(--plum)",
  "var(--sage)",
  "var(--moss)",
  "var(--coral-deep)",
];

function buildArcPath(
  cx: number,
  cy: number,
  a0: number,
  a1: number,
  R: number,
  Ri: number
): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const x0 = cx + Math.cos(a0) * R;
  const y0 = cy + Math.sin(a0) * R;
  const x1 = cx + Math.cos(a1) * R;
  const y1 = cy + Math.sin(a1) * R;
  const xi0 = cx + Math.cos(a0) * Ri;
  const yi0 = cy + Math.sin(a0) * Ri;
  const xi1 = cx + Math.cos(a1) * Ri;
  const yi1 = cy + Math.sin(a1) * Ri;
  return `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${Ri} ${Ri} 0 ${large} 0 ${xi0} ${yi0} Z`;
}

export function DonutChart({
  slices,
  size = 220,
  thickness = 28,
  centerLabel,
  centerValue,
  onSliceHover,
}: DonutChartProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const uid = useId().replace(/:/g, "");

  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 6;
  const Ri = R - thickness;

  const total = useMemo(
    () => slices.reduce((s, d) => s + d.value, 0),
    [slices]
  );

  const segments = useMemo(() => {
    const result: Array<DonutSlice & { a0: number; a1: number; midAngle: number; resolvedColor: string }> = [];
    let acc = 0;
    for (let i = 0; i < slices.length; i++) {
      const d = slices[i];
      const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2;
      const next = acc + d.value;
      const a1 = (next / total) * Math.PI * 2 - Math.PI / 2;
      result.push({
        ...d,
        a0,
        a1,
        midAngle: (a0 + a1) / 2,
        resolvedColor: d.color ?? PALETTE[i % PALETTE.length],
      });
      acc = next;
    }
    return result;
  }, [slices, total]);

  const hovered = hoverId != null ? segments.find((s) => s.id === hoverId) : null;

  const handleEnter = (id: string) => {
    setHoverId(id);
    onSliceHover?.(id);
  };
  const handleLeave = () => {
    setHoverId(null);
    onSliceHover?.(null);
  };
  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (hoverId === id) {
        handleLeave();
      } else {
        handleEnter(id);
      }
    }
  };

  const displayLabel = hovered
    ? hovered.label
    : centerLabel ?? "TOTAL";
  const displayValue = hovered
    ? `${((hovered.value / total) * 100).toFixed(1)}%`
    : centerValue ?? total.toLocaleString();

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      <defs>
        {segments.map((s) => (
          <filter key={`f-${uid}-${s.id}`} id={`glow-${uid}-${s.id}`}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}
      </defs>

      {segments.map((s) => {
        const isHovered = hoverId === s.id;
        const tx = isHovered ? Math.cos(s.midAngle) * 4 : 0;
        const ty = isHovered ? Math.sin(s.midAngle) * 4 : 0;
        const d = buildArcPath(cx, cy, s.a0, s.a1, R, Ri);
        return (
          <path
            key={s.id}
            d={d}
            fill={s.resolvedColor}
            opacity={hoverId == null || isHovered ? 1 : 0.45}
            style={{
              cursor: "pointer",
              transform: `translate(${tx}px, ${ty}px)${isHovered ? ' scale(1.04)' : ''}`,
              transformOrigin: 'center',
              transition: "opacity 0.2s ease, transform 0.2s ease, filter 0.2s ease",
              filter: isHovered ? `url(#glow-${uid}-${s.id}) brightness(1.1)` : undefined,
              outline: "none",
            }}
            onMouseEnter={() => handleEnter(s.id)}
            onMouseLeave={handleLeave}
            onFocus={() => handleEnter(s.id)}
            onBlur={handleLeave}
            onKeyDown={(e) => handleKeyDown(e, s.id)}
            tabIndex={0}
            role="button"
            aria-label={`${s.label} ${((s.value / total) * 100).toFixed(1)}%`}
            className="focus-visible:outline-2 focus-visible:outline-coral focus-visible:outline-offset-2"
          />
        );
      })}

      {/* Center label (serif) */}
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="10"
        fill="var(--ink-mute)"
        style={{
          fontFamily: "var(--font-ui, sans-serif)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          transition: "all 0.2s",
        }}
      >
        {displayLabel.toUpperCase()}
      </text>

      {/* Center value (mono) */}
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="18"
        fontWeight="500"
        fill="var(--ink)"
        style={{
          fontFamily: "var(--font-mono, monospace)",
          transition: "all 0.2s",
        }}
      >
        {displayValue}
      </text>
    </svg>
  );
}

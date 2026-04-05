"use client";

import { useState } from "react";

import clsx from "clsx";

import type { BestPick } from "@/types/navigator";

// ── Radar Chart (pure SVG) ──────────────────────────────

const AXES = ["MACRO", "CF", "VALUE", "MOM", "RISK"] as const;
const AXIS_KEYS: (keyof Pick<BestPick, "macro" | "cf" | "value" | "momentum" | "riskScore">)[] = [
  "macro",
  "cf",
  "value",
  "momentum",
  "riskScore",
];
const NUM_AXES = AXES.length;
const CX = 50;
const CY = 50;
const MAX_R = 38;

/** Convert (axisIndex, value 1-5) to SVG x,y. */
function polarPoint(index: number, value: number): [number, number] {
  const angle = (Math.PI * 2 * index) / NUM_AXES - Math.PI / 2;
  const r = (value / 5) * MAX_R;
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
}

function RadarChart({ pick }: { pick: BestPick }): JSX.Element {
  // Grid rings at levels 1-5
  const rings = [1, 2, 3, 4, 5];

  // Data polygon
  const dataPoints = AXIS_KEYS.map((key, i) =>
    polarPoint(i, Math.max(1, Math.min(5, pick[key]))),
  );
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + "Z";

  // Axis lines
  const axisLines = Array.from({ length: NUM_AXES }, (_, i) => polarPoint(i, 5));

  // Label positions (slightly beyond outer ring)
  const labelPoints = Array.from({ length: NUM_AXES }, (_, i) => {
    const angle = (Math.PI * 2 * i) / NUM_AXES - Math.PI / 2;
    const r = MAX_R + 11;
    return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)] as [number, number];
  });

  // Perimeter for stroke-dasharray animation
  const perimeter = dataPoints.reduce((acc, p, i) => {
    const next = dataPoints[(i + 1) % dataPoints.length];
    return acc + Math.hypot(next[0] - p[0], next[1] - p[1]);
  }, 0);

  return (
    <svg viewBox="0 0 100 100" className="h-[100px] w-[100px]">
      {/* Grid rings */}
      {rings.map((lv) => {
        const pts = Array.from({ length: NUM_AXES }, (_, i) => polarPoint(i, lv));
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + "Z";
        return (
          <path
            key={lv}
            d={d}
            fill="none"
            stroke="rgba(0,255,65,0.08)"
            strokeWidth={0.4}
          />
        );
      })}

      {/* Axis lines */}
      {axisLines.map((pt, i) => (
        <line
          key={i}
          x1={CX}
          y1={CY}
          x2={pt[0]}
          y2={pt[1]}
          stroke="rgba(0,255,65,0.15)"
          strokeWidth={0.3}
        />
      ))}

      {/* Data polygon */}
      <path
        d={dataPath}
        fill="rgba(0,255,65,0.1)"
        stroke="#00ff41"
        strokeWidth={1}
        strokeLinejoin="round"
        style={{
          strokeDasharray: perimeter,
          strokeDashoffset: perimeter,
          animation: "radar-draw 0.9s cubic-bezier(0.4,0,0.2,1) forwards",
        }}
      />

      {/* Axis labels */}
      {AXES.map((label, i) => (
        <text
          key={label}
          x={labelPoints[i][0]}
          y={labelPoints[i][1]}
          textAnchor="middle"
          dominantBaseline="central"
          className="font-mono-tech"
          fill="rgba(0,255,65,0.6)"
          fontSize={5}
        >
          {label}
        </text>
      ))}
    </svg>
  );
}

// ── Star rating ─────────────────────────────────────────

function StarDisplay({ count }: { count: number }): JSX.Element {
  const filled = Math.max(0, Math.min(5, Math.round(count)));
  return (
    <span className="font-mono-tech text-sm tracking-wider">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={clsx(
            i < filled ? "text-amber" : "text-text-muted",
            "inline-block animate-star-pop",
          )}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {i < filled ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

// ── Score bar ───────────────────────────────────────────

function ScoreBar({
  label,
  score,
  delay,
}: {
  label: string;
  score: number;
  delay: number;
}): JSX.Element {
  const pct = Math.max(0, Math.min(100, (score / 5) * 100));

  return (
    <div className="flex items-center gap-2">
      <span className="w-12 text-right font-mono-tech text-[10px] text-text-muted">
        {label}
      </span>
      <div className="h-1.5 flex-1 bg-mint/10">
        <div
          className="h-full animate-bar-fill bg-mint"
          style={{ width: `${pct}%`, animationDelay: `${delay}ms` }}
        />
      </div>
      <span className="w-4 font-mono-tech text-[10px] text-text-primary">
        {score}
      </span>
    </div>
  );
}

// ── Single pick card ────────────────────────────────────

function PickCard({ pick }: { pick: BestPick }): JSX.Element {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-glass-border bg-panel p-3 transition-shadow hover:shadow-card">
      {/* Rank + Name */}
      <div className="mb-1 flex items-center gap-2">
        <span className="font-orb text-[10px] text-amber">
          [{pick.rank}位]
        </span>
        <span className="font-mono-tech text-sm font-bold text-text-primary">
          {pick.name}
        </span>
        <span className="font-mono-tech text-[10px] text-text-muted">
          ({pick.code})
        </span>
      </div>

      {/* Stars */}
      <div className="mb-3">
        <StarDisplay count={pick.stars} />
      </div>

      {/* Radar chart */}
      <div className="mb-3 flex justify-center">
        <RadarChart pick={pick} />
      </div>

      {/* Score bars */}
      <div className="mb-3 space-y-1">
        {AXES.map((label, i) => (
          <ScoreBar
            key={label}
            label={label}
            score={pick[AXIS_KEYS[i]]}
            delay={i * 120}
          />
        ))}
      </div>

      {/* CF mini section */}
      <div className="mb-2 space-y-0.5 border-t border-glass-border pt-2">
        <p className="font-mono-tech text-[10px] text-text-secondary">
          FCFイールド: <span className="text-mint">{pick.fcfYield}</span>
        </p>
        <p className="font-mono-tech text-[10px] text-text-secondary">
          CFマージン: <span className="text-text-primary">{pick.cfMargin}</span>
        </p>
        <p className="font-mono-tech text-[10px] text-text-secondary">
          CF傾向: <span className="text-text-primary">{pick.cfTrend}</span>
        </p>
      </div>

      {/* Expand / collapse */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="font-mono-tech text-[10px] text-text-muted transition-colors hover:text-mint"
      >
        [{expanded ? "−" : "+"}] {expanded ? "閉じる" : "リスク詳細"}
      </button>

      <div
        className={clsx(
          "grid transition-all duration-300 ease-smooth",
          expanded ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-1 border-t border-glass-border pt-2">
            <p className="font-mono-tech text-[10px] text-amber/80">
              ⚠ {pick.risk1}
            </p>
            <p className="font-mono-tech text-[10px] text-amber/80">
              ⚠ {pick.risk2}
            </p>
            <p className="font-mono-tech text-[10px] text-text-muted">
              ▸ ヘッジ: {pick.hedge}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────

interface BestPicksSectionProps {
  bestStocks: BestPick[];
  bestFunds: BestPick[];
}

export function BestPicksSection({
  bestStocks,
  bestFunds,
}: BestPicksSectionProps): JSX.Element {
  return (
    <section className="animate-fade-in border border-glass-border bg-panel p-4">
      <h3 className="mb-4 font-orb text-[10px] uppercase tracking-widest text-text-muted">
        ▸ BEST PICKS
      </h3>

      {/* Best Stocks */}
      {bestStocks.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-3 font-orb text-[10px] uppercase tracking-widest text-text-muted">
            個別株 // TOP STOCKS
          </h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {bestStocks.map((pick) => (
              <PickCard key={pick.code} pick={pick} />
            ))}
          </div>
        </div>
      )}

      {/* Best Funds */}
      {bestFunds.length > 0 && (
        <div>
          <h4 className="mb-3 font-orb text-[10px] uppercase tracking-widest text-text-muted">
            ETF/投信 // TOP FUNDS
          </h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {bestFunds.map((pick) => (
              <PickCard key={pick.code} pick={pick} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

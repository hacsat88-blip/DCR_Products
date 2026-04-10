"use client";

import { useId } from "react";
import clsx from "clsx";

import { AnimatedNumber, EASE_SMOOTH, motion } from "./MotionPrimitives";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
}

function scoreColor(score: number): string {
  if (score >= 75) return "#22C55E";
  if (score >= 55) return "#4C6EF5";
  if (score >= 40) return "#ffd700";
  return "#EF4444";
}

function scoreGradientSuffix(score: number): string {
  if (score >= 75) return "mint";
  if (score >= 55) return "blue";
  if (score >= 40) return "amber";
  return "danger";
}

export function ScoreRing({ score, size = 48, strokeWidth = 3, className, showLabel = true }: ScoreRingProps): JSX.Element {
  const uid = useId().replace(/:/g, "");
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(100, Math.max(0, score));
  const offset = circumference - (clampedScore / 100) * circumference;
  const color = scoreColor(score);
  const shouldPulse = score > 80;
  const gMint = `score-grad-mint-${uid}`;
  const gBlue = `score-grad-blue-${uid}`;
  const gAmber = `score-grad-amber-${uid}`;
  const gDanger = `score-grad-danger-${uid}`;

  return (
    <div className={clsx("relative inline-flex items-center justify-center", shouldPulse && "animate-score-pulse", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gMint} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="100%" stopColor="#16A34A" />
          </linearGradient>
          <linearGradient id={gBlue} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4C6EF5" />
            <stop offset="100%" stopColor="#3B5BDB" />
          </linearGradient>
          <linearGradient id={gAmber} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd700" />
            <stop offset="100%" stopColor="#ccac00" />
          </linearGradient>
          <linearGradient id={gDanger} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} className="score-ring-track" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="score-ring-fill"
          stroke={`url(#score-grad-${scoreGradientSuffix(score)}-${uid})`}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: EASE_SMOOTH, delay: 0.1 }}
        />
      </svg>
      {showLabel && (
        <AnimatedNumber
          value={Math.round(clampedScore)}
          duration={0.9}
          formatFn={(n) => String(Math.round(n))}
          className={`absolute font-mono tabular-nums text-xs font-bold`}
          style={{ color }}
        />
      )}
    </div>
  );
}

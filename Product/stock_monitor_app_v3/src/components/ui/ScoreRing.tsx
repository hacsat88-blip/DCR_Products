import clsx from "clsx";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
}

function scoreColor(score: number): string {
  if (score >= 75) return "#5bf0ba";
  if (score >= 55) return "#8bb0ff";
  if (score >= 40) return "#ffc772";
  return "#ff8798";
}

function scoreGradientId(score: number): string {
  if (score >= 75) return "score-grad-mint";
  if (score >= 55) return "score-grad-blue";
  if (score >= 40) return "score-grad-amber";
  return "score-grad-danger";
}

export function ScoreRing({ score, size = 48, strokeWidth = 3, className, showLabel = true }: ScoreRingProps): JSX.Element {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(100, Math.max(0, score));
  const offset = circumference - (clampedScore / 100) * circumference;
  const color = scoreColor(score);
  const shouldPulse = score > 80;

  return (
    <div className={clsx("relative inline-flex items-center justify-center animate-fade-in", shouldPulse && "animate-score-pulse", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="score-grad-mint" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5bf0ba" />
            <stop offset="100%" stopColor="#2adba0" />
          </linearGradient>
          <linearGradient id="score-grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8bb0ff" />
            <stop offset="100%" stopColor="#6b94ff" />
          </linearGradient>
          <linearGradient id="score-grad-amber" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffc772" />
            <stop offset="100%" stopColor="#ffb340" />
          </linearGradient>
          <linearGradient id="score-grad-danger" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff8798" />
            <stop offset="100%" stopColor="#ff5c72" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} className="score-ring-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="score-ring-fill"
          stroke={`url(#${scoreGradientId(score)})`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {showLabel && (
        <span className="absolute text-xs font-bold" style={{ color }}>
          {score}
        </span>
      )}
    </div>
  );
}

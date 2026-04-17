import clsx from "clsx";

export interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  ariaLabel?: string;
  className?: string;
}

export function Sparkline({
  values,
  width = 120,
  height = 40,
  color = "var(--inp-accent, #00D9FF)",
  ariaLabel = "スパークライン",
  className,
}: SparklineProps): JSX.Element {
  if (!values || values.length === 0) {
    return (
      <span
        role="img"
        aria-label={ariaLabel}
        className={clsx("inp-sparkline-empty inline-flex items-center justify-center", className)}
        style={{ width, height, color: "var(--inp-text-secondary)" }}
        data-testid="sparkline-empty"
      >
        —
      </span>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const pad = 1;
  const inner = height - pad * 2;

  const points = values.map((v, i) => {
    const x = values.length === 1 ? width / 2 : i * step;
    const y = pad + inner - ((v - min) / range) * inner;
    return [x, y] as const;
  });

  const d = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

  const minIdx = values.indexOf(min);
  const maxIdx = values.indexOf(max);
  const [mnx, mny] = points[minIdx]!;
  const [mxx, mxy] = points[maxIdx]!;

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      className={clsx("inp-sparkline", className)}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      data-testid="sparkline-svg"
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={0.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={mnx}
        cy={mny}
        r={1.5}
        fill="var(--inp-negative, #F97066)"
        data-testid="sparkline-min"
      />
      <circle
        cx={mxx}
        cy={mxy}
        r={1.5}
        fill="var(--inp-positive, #22C55E)"
        data-testid="sparkline-max"
      />
    </svg>
  );
}

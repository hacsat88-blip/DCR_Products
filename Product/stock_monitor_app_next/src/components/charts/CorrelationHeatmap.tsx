import { Fragment } from "react";
import clsx from "clsx";

export interface CorrelationHeatmapProps {
  labels: string[];
  matrix: number[][];
  cellSize?: number;
  className?: string;
}

function interpolate(v: number): string {
  if (!Number.isFinite(v)) return "transparent";
  const c = Math.max(-1, Math.min(1, v));
  if (c >= 0) {
    return `rgba(249, 112, 102, ${c.toFixed(3)})`;
  }
  return `rgba(90, 145, 255, ${(-c).toFixed(3)})`;
}

export function CorrelationHeatmap({
  labels,
  matrix,
  cellSize = 36,
  className,
}: CorrelationHeatmapProps): JSX.Element {
  return (
    <div
      role="table"
      aria-label="相関マトリクス"
      className={clsx("inp-corr-heatmap inline-grid", className)}
      style={{
        gridTemplateColumns: `auto repeat(${labels.length}, ${cellSize}px)`,
      }}
    >
      <div />
      {labels.map((l) => (
        <div
          key={`h-${l}`}
          className="px-1 text-center text-[11px]"
          style={{ color: "var(--inp-text-secondary, #9AA9BF)" }}
        >
          {l}
        </div>
      ))}
      {labels.map((rowLabel, i) => (
        <Fragment key={`row-${rowLabel}`}>
          <div
            className="px-2 text-right text-[11px]"
            style={{ color: "var(--inp-text-secondary, #9AA9BF)" }}
          >
            {rowLabel}
          </div>
          {labels.map((colLabel, j) => {
            const raw = i === j ? 1 : matrix[i]?.[j];
            const value = typeof raw === "number" ? raw : NaN;
            const display = Number.isFinite(value) ? value.toFixed(2) : "—";
            const bg =
              i === j ? "var(--inp-accent, #00D9FF)" : interpolate(value);
            return (
              <div
                key={`c-${i}-${j}`}
                role="cell"
                data-testid={`corr-${rowLabel}-${colLabel}`}
                className="flex items-center justify-center text-[10px]"
                style={{
                  width: cellSize,
                  height: cellSize,
                  background: bg,
                  color: "var(--inp-text-primary, #E6EDF7)",
                  border: "1px solid var(--inp-border, #263042)",
                }}
                title={`${rowLabel} × ${colLabel}: ${display}`}
              >
                {display}
              </div>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}

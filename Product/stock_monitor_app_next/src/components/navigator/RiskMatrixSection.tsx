"use client";

import clsx from "clsx";

import type {
  MatrixEntry,
  AllocationConfig,
  CorrelationPair,
  ReturnLevel,
  RiskLevel,
} from "@/types/navigator";

// ── Colour maps ─────────────────────────────────────────

const RETURN_COLOR: Record<ReturnLevel, string> = {
  高: "text-positive",
  中: "text-amber",
  低: "text-text-muted",
};

const RISK_COLOR: Record<RiskLevel, string> = {
  高: "text-danger",
  中: "text-amber",
  低: "text-positive",
};

// ── Matrix cards ────────────────────────────────────────

function MatrixCard({ entry }: { entry: MatrixEntry }): JSX.Element {
  return (
    <div
      className={clsx(
        "border bg-panel p-3 transition-colors hover:bg-panel-hover",
        entry.warn ? "border-danger/40" : "border-glass-border",
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="font-mono tabular-nums text-sm font-bold text-text-primary">
          {entry.name}
        </span>
        {entry.warn && (
          <span className="text-xs text-danger" title="相関リスク">
            ⚠
          </span>
        )}
      </div>

      <div className="space-y-0.5 font-mono tabular-nums text-[10px]">
        <div>
          <span className="text-text-muted">RET: </span>
          <span className={RETURN_COLOR[entry.ret]}>{entry.ret}</span>
        </div>
        <div>
          <span className="text-text-muted">RSK: </span>
          <span className={RISK_COLOR[entry.risk]}>{entry.risk}</span>
        </div>
        <div>
          <span className="text-text-muted">CF: </span>
          <span>{entry.cf}</span>
        </div>
        <div className="mt-1 border-t border-glass-border pt-1">
          <span
            className={clsx(
              "font-semiboldtext-[9px] uppercase tracking-wider",
              entry.pos === "コア"
                ? "text-positive"
                : entry.pos === "サテライト"
                  ? "text-amber"
                  : "text-secondary",
            )}
          >
            {entry.pos}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Allocation bar ──────────────────────────────────────

function AllocationBar({ alloc }: { alloc: AllocationConfig }): JSX.Element {
  const total = alloc.stocks + alloc.funds + alloc.cash;
  const pctStocks = total > 0 ? (alloc.stocks / total) * 100 : 0;
  const pctFunds = total > 0 ? (alloc.funds / total) * 100 : 0;
  const pctCash = total > 0 ? (alloc.cash / total) * 100 : 0;

  return (
    <div>
      {/* Stacked bar */}
      <div className="flex h-4 overflow-hidden border border-glass-border">
        {pctStocks > 0 && (
          <div
            className="flex items-center justify-center bg-positive/40 font-mono tabular-nums text-[8px] text-canvas transition-all duration-700"
            style={{ width: `${pctStocks}%` }}
          >
            {pctStocks >= 10 && `${alloc.stocks}%`}
          </div>
        )}
        {pctFunds > 0 && (
          <div
            className="flex items-center justify-center bg-secondary/40 font-mono tabular-nums text-[8px] text-canvas transition-all duration-700"
            style={{ width: `${pctFunds}%` }}
          >
            {pctFunds >= 10 && `${alloc.funds}%`}
          </div>
        )}
        {pctCash > 0 && (
          <div
            className="flex items-center justify-center bg-text-muted/30 font-mono tabular-nums text-[8px] text-text-muted transition-all duration-700"
            style={{ width: `${pctCash}%` }}
          >
            {pctCash >= 10 && `${alloc.cash}%`}
          </div>
        )}
      </div>

      {/* Labels */}
      <div className="mt-1.5 flex justify-between font-mono tabular-nums text-[10px]">
        <span className="text-positive">
          ■ 個別株 {alloc.stocks}%
        </span>
        <span className="text-secondary">
          ■ ETF/投信 {alloc.funds}%
        </span>
        <span className="text-text-muted">
          ■ 現金 {alloc.cash}%
        </span>
      </div>
    </div>
  );
}

// ── Correlation table ───────────────────────────────────

function CorrelationTable({ pairs }: { pairs: CorrelationPair[] }): JSX.Element | null {
  if (pairs.length === 0) return null;

  return (
    <div>
      <h4 className="mb-2 font-semiboldtext-[10px] uppercase tracking-widest text-text-muted">
        CORRELATION MATRIX
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-glass-border">
              <th className="px-3 py-1.5 font-semiboldtext-[10px] uppercase tracking-widest text-text-muted">
                PAIR
              </th>
              <th className="px-3 py-1.5 font-semiboldtext-[10px] uppercase tracking-widest text-text-muted">
                COEFF
              </th>
              <th className="px-3 py-1.5 font-semiboldtext-[10px] uppercase tracking-widest text-text-muted">
                LEVEL
              </th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair) => {
              const coeff = pair.coeff;
              let color: string;
              let levelLabel: string;

              if (coeff > 0.7) {
                color = "text-danger";
                levelLabel = "⚠ 高";
              } else if (coeff >= 0.4) {
                color = "text-amber";
                levelLabel = "中";
              } else {
                color = "text-positive";
                levelLabel = "低";
              }

              return (
                <tr
                  key={`${pair.a}-${pair.b}`}
                  className="border-b border-glass-border"
                >
                  <td className="px-3 py-1.5 font-mono tabular-nums text-xs text-text-primary">
                    {pair.a} × {pair.b}
                  </td>
                  <td className={clsx("px-3 py-1.5 font-mono tabular-nums text-xs", color)}>
                    {coeff.toFixed(2)}
                  </td>
                  <td className={clsx("px-3 py-1.5 font-mono tabular-nums text-[10px]", color)}>
                    {levelLabel}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────

interface RiskMatrixSectionProps {
  matrix: MatrixEntry[];
  alloc: AllocationConfig;
  corrMatrix: CorrelationPair[];
}

export function RiskMatrixSection({
  matrix,
  alloc,
  corrMatrix,
}: RiskMatrixSectionProps): JSX.Element {
  return (
    <section className="animate-fade-in border border-glass-border bg-panel p-4">
      <h3 className="mb-4 font-semiboldtext-[10px] uppercase tracking-widest text-text-muted">
        ▸ RISK-RETURN MATRIX + ALLOCATION
      </h3>

      {/* Matrix grid */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {matrix.map((entry) => (
          <MatrixCard key={entry.name} entry={entry} />
        ))}
      </div>

      {/* Allocation */}
      <div className="mb-4">
        <h4 className="mb-2 font-semiboldtext-[10px] uppercase tracking-widest text-text-muted">
          TARGET ALLOCATION
        </h4>
        <AllocationBar alloc={alloc} />
      </div>

      {/* Correlation */}
      <CorrelationTable pairs={corrMatrix} />
    </section>
  );
}

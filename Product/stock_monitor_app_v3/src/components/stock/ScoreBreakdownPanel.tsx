import clsx from "clsx";

import { formatActionLabel } from "@/lib/format";
import { EvaluatedStock } from "@/types/stock";

interface ScoreBreakdownPanelProps {
  stock: EvaluatedStock;
  compact?: boolean;
}

export function ScoreBreakdownPanel({
  stock,
  compact = false
}: ScoreBreakdownPanelProps): JSX.Element {
  const bonusItems = stock.breakdown.filter((item) => item.type === "bonus");
  const penaltyItems = stock.breakdown.filter((item) => item.type === "penalty");

  return (
    <section className="rounded-2xl border border-slate-700 bg-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-100">本命度の内訳</h4>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full border border-slate-600 px-2 py-1 text-slate-200">
            本命度 {stock.score}
          </span>
          <span className="rounded-full border border-slate-600 px-2 py-1 text-slate-200">
            {formatActionLabel(stock.evaluatedAction)}
          </span>
        </div>
      </div>

      <p className="mt-2 text-sm text-slate-300">{stock.scoreSummary}</p>

      <div className={clsx("mt-3 grid gap-2", compact ? "grid-cols-1" : "md:grid-cols-2")}>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
          <p className="text-xs font-semibold text-mint">加点項目</p>
          <ul className="mt-2 space-y-2 text-xs text-slate-200">
            {bonusItems.length === 0 ? <li className="text-slate-500">なし</li> : null}
            {bonusItems.map((item) => (
              <li key={item.id}>
                <p className="font-semibold">{item.label}: +{item.value}</p>
                <p className="text-slate-400">{item.reason}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
          <p className="text-xs font-semibold text-danger">減点項目</p>
          <ul className="mt-2 space-y-2 text-xs text-slate-200">
            {penaltyItems.length === 0 ? <li className="text-slate-500">なし</li> : null}
            {penaltyItems.map((item) => (
              <li key={item.id}>
                <p className="font-semibold">
                  {item.label}: {item.value}
                </p>
                <p className="text-slate-400">{item.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {!compact ? <p className="mt-3 text-xs text-slate-400">危険信号: {stock.riskSignal}</p> : null}
    </section>
  );
}

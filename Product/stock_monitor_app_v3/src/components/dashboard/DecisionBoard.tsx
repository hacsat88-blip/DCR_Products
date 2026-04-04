import React, { useMemo } from "react";
import clsx from "clsx";

import { actionTone, formatActionLabel } from "@/lib/format";
import { AlertEvent } from "@/types/alert";
import { EvaluatedStock } from "@/types/stock";
import { useStockStore } from "@/store/useStockStore";

interface DecisionBoardProps {
  stocks: EvaluatedStock[];
  alertEvents: AlertEvent[];
}

function DecisionBoardInner({ stocks, alertEvents }: DecisionBoardProps): JSX.Element {
  const holdingsMap = useStockStore((s) => s.holdingsMap);

  const ranked = useMemo(
    () =>
      [...stocks].sort((a, b) => {
        if (Boolean(a.watched) !== Boolean(b.watched)) {
          return Number(Boolean(b.watched)) - Number(Boolean(a.watched));
        }
        return b.score - a.score;
      }),
    [stocks]
  );

  const activeAlerts = useMemo(
    () => alertEvents.filter((event) => !event.dismissed),
    [alertEvents]
  );

  return (
    <section className="rounded-2xl border border-slate-700/60 bg-panel p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">判断ボード</h2>
        <p className="text-xs text-slate-400">監視中銘柄を優先して表示</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {ranked.map((stock) => {
          const tone = actionTone(stock.evaluatedAction);
          const stockAlertCount = activeAlerts.filter((event) => event.stockCode === stock.code).length;
          const holding = holdingsMap[stock.id] ?? 0;
          return (
            <article key={stock.id} className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs tracking-[0.12em] text-slate-400">{stock.code}</p>
                  <h3 className="text-base font-semibold text-slate-100">
                    {stock.name}
                    {holding > 0 && (
                      <span className="ml-1 text-xs font-normal text-mint">({holding.toLocaleString("ja-JP")}株)</span>
                    )}
                  </h3>
                </div>
                <span
                  className={clsx(
                    "rounded-full border px-2 py-1 text-[11px] font-semibold",
                    tone === "buy" && "border-mint/50 bg-mint/10 text-mint",
                    tone === "wait" && "border-blue/50 bg-blue/10 text-blue",
                    tone === "exclude" && "border-danger/50 bg-danger/10 text-danger"
                  )}
                >
                  {formatActionLabel(stock.evaluatedAction)}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
                <span>本命度: {stock.score}</span>
                <span>アラート: {stockAlertCount}</span>
              </div>

              <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-200">{stock.oneLiner}</p>
              <p className="mt-3 text-xs text-slate-400">
                注目点: {stock.coreKpiLabel} ({stock.coreKpiValue})
              </p>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
                崩れる条件: {stock.collapseCondition}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export const DecisionBoard = React.memo(DecisionBoardInner);

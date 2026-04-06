import React, { useMemo } from"react";
import clsx from"clsx";

import { actionTone, formatActionLabel } from"@/lib/format";
import { AlertEvent } from"@/types/alert";
import { EvaluatedStock } from"@/types/stock";
import { useStockStore } from"@/store/useStockStore";

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
 <section className="rounded-lg border border-border-subtle bg-panel p-5 shadow-card">
 <div className="mb-3 flex items-center justify-between gap-3">
 <h2 className="text-lg font-semibold text-text-primary">判断ボード</h2>
 <p className="text-xs text-text-muted">監視中銘柄を優先して表示</p>
 </div>

 <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
 {ranked.map((stock) => {
 const tone = actionTone(stock.evaluatedAction);
 const stockAlertCount = activeAlerts.filter((event) => event.stockCode === stock.code).length;
 const holding = holdingsMap[stock.id] ?? 0;
 return (
 <article key={stock.id} className="rounded-lg border border-border-subtle bg-canvas-deep/60 p-3">
 <div className="flex items-start justify-between gap-2">
 <div>
 <p className="text-xs tracking-[0.12em] text-text-muted font-mono tabular-nums">{stock.code}</p>
 <h3 className="text-base font-semibold text-text-primary">
 {stock.name}
 {holding > 0 && (
 <span className="ml-1 text-xs font-normal text-positive">({holding.toLocaleString("ja-JP")}株)</span>
 )}
 </h3>
 </div>
 <span
 className={clsx(
"rounded-lg border px-2 py-1 text-[11px] font-semibold",
 tone ==="buy" &&"border-positive/50 bg-positive/10 text-positive",
 tone ==="wait" &&"border-secondary/50 bg-secondary/10 text-secondary",
 tone ==="exclude" &&"border-danger/50 bg-danger/10 text-danger"
 )}
 >
 {formatActionLabel(stock.evaluatedAction)}
 </span>
 </div>

 <div className="mt-2 flex items-center justify-between text-xs text-text-secondary">
 <span>本命度: <span className="font-mono tabular-nums">{stock.score}</span></span>
 <span>アラート: {stockAlertCount}</span>
 </div>

 <p className="mt-3 line-clamp-2 text-sm leading-6 text-text-primary">{stock.oneLiner}</p>
 <p className="mt-3 text-xs text-text-muted">
 注目点: {stock.coreKpiLabel} ({stock.coreKpiValue})
 </p>
 <p className="mt-2 line-clamp-2 text-xs leading-5 text-text-muted">
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

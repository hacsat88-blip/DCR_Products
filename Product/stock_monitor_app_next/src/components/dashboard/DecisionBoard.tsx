import React, { useMemo } from "react";
import clsx from "clsx";

import { actionTone, formatActionLabel } from "@/lib/format";
import {
  formatStockChangeDisplay,
  formatStockPriceDisplay,
  getRemoveStockAriaLabel,
  getRemoveStockConfirmMessage,
  getStockDisplayName,
  getStockInsightText,
  isStockPricePending
} from "@/lib/stockPresentation";
import { SrcDot } from "@/components/ui/SrcDot";
import { useStockStore } from "@/store/useStockStore";
import { AlertEvent } from "@/types/alert";
import { EvaluatedStock } from "@/types/stock";

interface DecisionBoardProps {
  stocks: EvaluatedStock[];
  alertEvents: AlertEvent[];
  onRemove: (stockCode: string) => void;
}

function DecisionBoardInner({ stocks, alertEvents, onRemove }: DecisionBoardProps): JSX.Element {
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

  const activeAlerts = useMemo(() => alertEvents.filter((event) => !event.dismissed), [alertEvents]);

  return (
    <section className="rounded-lg border border-border-subtle bg-panel p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text-primary">判断ボード</h2>
        <p className="text-xs text-text-muted">監視中銘柄を優先して表示</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {ranked.map((stock) => {
          const tone = actionTone(stock.evaluatedAction);
          const pricePending = isStockPricePending(stock);
          const changePositive = !pricePending && stock.changePercent >= 0;
          const stockAlertCount = activeAlerts.filter((event) => event.stockCode === stock.code).length;
          const holding = holdingsMap[stock.id] ?? 0;
          const displayName = getStockDisplayName(stock);
          const insightText = getStockInsightText(stock);

          const handleRemove = (): void => {
            if (typeof window !== "undefined" && !window.confirm(getRemoveStockConfirmMessage(stock))) {
              return;
            }
            onRemove(stock.code);
          };

          return (
            <article key={stock.id} className="rounded-lg border border-border-subtle bg-canvas-deep/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono tabular-nums text-xs tracking-[0.12em] text-text-muted">{stock.code}</p>
                  <h3 className="flex flex-wrap items-center gap-1.5 text-base font-semibold text-text-primary">
                    <span>{displayName}</span>
                    <span className="font-mono tabular-nums text-xs text-text-secondary">
                      {formatStockPriceDisplay(stock)}
                    </span>
                    <span
                      className={clsx(
                        "inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono tabular-nums text-[10px] font-semibold",
                        pricePending
                          ? "border-border-subtle text-text-muted"
                          : changePositive
                            ? "border-positive/40 bg-positive/10 text-positive"
                            : "border-danger/40 bg-danger/10 text-danger"
                      )}
                    >
                      {formatStockChangeDisplay(stock)}
                    </span>
                    <SrcDot label={stock.priceSourceLabel} scope="price" />
                    {holding > 0 && (
                      <span className="text-xs font-normal text-positive">
                        ({holding.toLocaleString("ja-JP")}株)
                      </span>
                    )}
                  </h3>
                </div>
                <span
                  className={clsx(
                    "rounded-lg border px-2 py-1 text-[11px] font-semibold",
                    tone === "buy" && "border-positive/50 bg-positive/10 text-positive",
                    tone === "wait" && "border-secondary/50 bg-secondary/10 text-secondary",
                    tone === "exclude" && "border-danger/50 bg-danger/10 text-danger"
                  )}
                >
                  {formatActionLabel(stock.evaluatedAction)}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-text-secondary">
                <span>
                  本命度: <span className="font-mono tabular-nums">{stock.score}</span>
                </span>
                <span>アラート: {stockAlertCount}</span>
              </div>

              <p className="mt-3 line-clamp-2 text-sm leading-6 text-text-primary">{insightText}</p>
              <p className="mt-3 text-xs text-text-muted">
                注目点: {stock.coreKpiLabel} ({stock.coreKpiValue})
              </p>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-text-muted">
                崩れる条件: {stock.collapseCondition}
              </p>

              <div className="mt-3 border-t border-border-subtle pt-3">
                <button
                  type="button"
                  onClick={handleRemove}
                  aria-label={getRemoveStockAriaLabel(stock)}
                  className="w-full rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/15"
                >
                  削除
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export const DecisionBoard = React.memo(DecisionBoardInner);

import React, { useMemo } from "react";
import clsx from "clsx";

import { formatActionLabel } from "@/lib/format";
import { EvaluatedStock, StockAction } from "@/types/stock";

interface ActionLaneBoardProps {
  stocks: EvaluatedStock[];
  onOpenDetail: (stockId: string) => void;
}

const LANE_ORDER: StockAction[] = ["buy_now", "wait_earnings", "wait_pullback", "exclude"];

function laneTone(action: StockAction): string {
  if (action === "buy_now") return "border-mint/40 bg-mint/5";
  if (action === "exclude") return "border-danger/40 bg-danger/5";
  return "border-blue/30 bg-blue/5";
}

function ActionLaneBoardInner({ stocks, onOpenDetail }: ActionLaneBoardProps): JSX.Element {
  const grouped = useMemo(() => {
    const map = new Map<StockAction, EvaluatedStock[]>();
    for (const action of LANE_ORDER) {
      map.set(action, []);
    }
    for (const stock of stocks) {
      map.get(stock.evaluatedAction)?.push(stock);
    }
    for (const action of LANE_ORDER) {
      map.get(action)?.sort((a, b) => b.score - a.score);
    }
    return map;
  }, [stocks]);

  return (
    <section className="rounded-none border border-border-subtle bg-panel p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text-primary font-orb">判断レーン</h2>
        <p className="text-xs text-text-muted">判定別に俯瞰して優先順位を確認</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {LANE_ORDER.map((action) => {
          const rows = grouped.get(action) ?? [];
          return (
            <article key={action} className={clsx("rounded-none border p-3", laneTone(action))}>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-text-primary font-orb uppercase">{formatActionLabel(action)}</p>
                <span className="rounded-none border border-border-subtle px-2 py-0.5 text-[11px] text-text-primary">
                  {rows.length}件
                </span>
              </div>
              {rows.length === 0 ? (
                <p className="text-xs text-text-muted">対象なし</p>
              ) : (
                <ul className="space-y-2">
                  {rows.map((stock) => (
                    <li key={stock.id}>
                      <button
                        type="button"
                        onClick={() => onOpenDetail(stock.id)}
                        className="w-full rounded-none border border-border-subtle bg-canvas-deep/60 px-2 py-2 text-left text-xs text-text-primary transition hover:border-border-active"
                      >
                        <p className="font-semibold">
                          {stock.code} {stock.name}
                        </p>
                        <p className="mt-1 text-text-muted">本命度 <span className="font-mono-tech">{stock.score}</span></p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export const ActionLaneBoard = React.memo(ActionLaneBoardInner);

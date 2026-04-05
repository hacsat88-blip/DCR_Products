"use client";

import React, { useMemo, useState } from "react";
import clsx from "clsx";

import { formatActionLabel } from "@/lib/format";
import { StockSnapshot } from "@/types/archive";
import { EvaluatedStock } from "@/types/stock";

interface MorningCheckPanelProps {
  stocks: EvaluatedStock[];
  snapshots: StockSnapshot[];
}

interface MorningDiffRow {
  code: string;
  name: string;
  currentAction: string | null;
  previousAction: string | null;
  actionChanged: boolean;
  scoreDelta: number | null;
  priceDeltaPct: number | null;
}

function toActionLabel(value: string | null): string {
  if (value === "buy_now" || value === "wait_earnings" || value === "wait_pullback" || value === "exclude") {
    return formatActionLabel(value);
  }
  return "-";
}

function MorningCheckPanelInner({ stocks, snapshots }: MorningCheckPanelProps): JSX.Element {
  const [changesOnly, setChangesOnly] = useState(true);

  const rows = useMemo<MorningDiffRow[]>(() => {
    const byCode = new Map<string, StockSnapshot[]>();
    for (const snapshot of snapshots) {
      const bucket = byCode.get(snapshot.code) ?? [];
      bucket.push(snapshot);
      byCode.set(snapshot.code, bucket);
    }

    return stocks.map((stock) => {
      const timeline = [...(byCode.get(stock.code) ?? [])].sort(
        (a, b) => Date.parse(b.checkedAt) - Date.parse(a.checkedAt)
      );
      const latest = timeline[0] ?? null;
      const scoreDelta =
        latest?.score !== null &&
        latest?.score !== undefined &&
        stock.score !== null &&
        stock.score !== undefined
          ? stock.score - latest.score
          : null;
      const priceDeltaPct =
        latest?.price !== null &&
        latest?.price !== undefined &&
        stock.price !== null &&
        stock.price !== undefined &&
        latest.price !== 0
          ? ((stock.price - latest.price) / latest.price) * 100
          : null;
      const actionChanged = Boolean(
        latest?.evaluatedAction && stock.evaluatedAction && stock.evaluatedAction !== latest.evaluatedAction
      );

      return {
        code: stock.code,
        name: stock.name,
        currentAction: stock.evaluatedAction,
        previousAction: latest?.evaluatedAction ?? null,
        actionChanged,
        scoreDelta,
        priceDeltaPct
      };
    });
  }, [snapshots, stocks]);

  const visibleRows = useMemo(
    () =>
      rows.filter((row) => {
        if (!changesOnly) return true;
        return row.actionChanged || (row.scoreDelta !== null && row.scoreDelta !== 0);
      }),
    [rows, changesOnly]
  );

  return (
    <section className="rounded-none border border-border-subtle bg-panel p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary font-orb">朝チェックモード</h2>
          <p className="text-xs text-text-secondary">前回スナップショットとの差分だけ先に確認できます。</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={changesOnly}
            onChange={(event) => setChangesOnly(event.target.checked)}
          />
          差分のみ表示
        </label>
      </div>

      {visibleRows.length === 0 ? (
        <p className="text-sm text-text-secondary">差分はありません。スナップショット保存後に変化を追跡できます。</p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {visibleRows.map((row) => (
            <article key={row.code} className="rounded-none border border-border-subtle bg-canvas-deep/60 p-3">
              <p className="text-xs tracking-[0.12em] text-text-muted">{row.code}</p>
              <p className="text-sm font-semibold text-text-primary">{row.name}</p>
              <p className="mt-2 text-xs text-text-secondary">
                判定: {toActionLabel(row.currentAction)}
                {row.actionChanged ? ` (前回: ${toActionLabel(row.previousAction)})` : ""}
              </p>
              <p
                className={clsx(
                  "mt-1 text-xs",
                  row.scoreDelta === null ? "text-text-muted" : row.scoreDelta > 0 ? "text-mint" : "text-danger"
                )}
              >
                スコア差分:{" "}
                <span className="font-mono-tech">{row.scoreDelta === null ? "-" : `${row.scoreDelta > 0 ? "+" : ""}${row.scoreDelta.toFixed(1)}`}</span>
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                価格差分:{" "}
                <span className="font-mono-tech">{row.priceDeltaPct === null
                  ? "-"
                  : `${row.priceDeltaPct > 0 ? "+" : ""}${row.priceDeltaPct.toFixed(2)}%`}</span>
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export const MorningCheckPanel = React.memo(MorningCheckPanelInner);

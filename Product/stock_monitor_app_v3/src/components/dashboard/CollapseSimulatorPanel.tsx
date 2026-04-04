"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";

import { evaluateStock } from "@/lib/scoring";
import { formatActionLabel } from "@/lib/format";
import { ScoringConfig } from "@/types/scoring";
import { EvaluatedStock } from "@/types/stock";

interface CollapseSimulatorPanelProps {
  stock: EvaluatedStock | null;
  scoringConfig: ScoringConfig;
}

function zoneColor(score: number): string {
  if (score >= 70) return "text-mint";
  if (score >= 40) return "text-amber";
  return "text-danger";
}

function ImpactZone({ current, simulated }: { current: number; simulated: number | null }): JSX.Element {
  const clampPos = (v: number) => Math.max(0, Math.min(100, v));
  return (
    <div className="mt-3">
      <div className="flex text-[9px] font-medium tracking-wider text-text-muted">
        <span className="flex-1">危険圏</span>
        <span className="flex-1 text-center">注意圏</span>
        <span className="flex-1 text-right">安全圏</span>
      </div>
      <div className="relative mt-1 h-2 overflow-hidden rounded-full">
        <div className="absolute inset-0 flex">
          <div className="h-full flex-[40] bg-danger/20" />
          <div className="h-full flex-[30] bg-amber/20" />
          <div className="h-full flex-[30] bg-mint/20" />
        </div>
        <div
          className="absolute top-0 h-full w-1 rounded-full bg-text-primary"
          style={{ left: `${clampPos(current)}%` }}
          title={`現在: ${current}`}
        />
        {simulated !== null && (
          <div
            className="absolute top-0 h-full w-1 rounded-full bg-amber opacity-80"
            style={{ left: `${clampPos(simulated)}%` }}
            title={`シミュ: ${simulated}`}
          />
        )}
      </div>
    </div>
  );
}

export function CollapseSimulatorPanel({
  stock,
  scoringConfig
}: CollapseSimulatorPanelProps): JSX.Element {
  const [revenueDelta, setRevenueDelta] = useState(0);
  const [opDelta, setOpDelta] = useState(0);
  const [perDelta, setPerDelta] = useState(0);

  const simulated = useMemo(() => {
    if (!stock) return null;
    const simulatedStock = {
      ...stock,
      revenueGrowth: stock.revenueGrowth === null ? null : stock.revenueGrowth + revenueDelta,
      opGrowth: stock.opGrowth === null ? null : stock.opGrowth + opDelta,
      per: stock.per === null ? null : stock.per + perDelta
    };
    return evaluateStock(simulatedStock, scoringConfig);
  }, [opDelta, perDelta, revenueDelta, scoringConfig, stock]);

  const scoreDiff = stock && simulated ? simulated.score - stock.score : 0;
  const bigChange = Math.abs(scoreDiff) > 10;

  return (
    <section className="card-surface p-5">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-slate-100">崩れシミュレーター</h2>
        <p className="text-xs text-slate-400">成長率やPERを仮に動かして、判定がどこで崩れるかを確認します。</p>
      </div>

      {!stock ? (
        <p className="text-sm text-slate-300">銘柄を選択するとシミュレーションできます。</p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="rounded-xl border border-border-subtle bg-canvas-deep/50 p-3 text-xs text-slate-200">
              <span className="flex items-center justify-between">
                <span>売上成長補正</span>
                <span className="font-mono font-semibold text-mint">{revenueDelta > 0 ? "+" : ""}{revenueDelta}</span>
              </span>
              <input
                type="range"
                min={-30}
                max={30}
                value={revenueDelta}
                onChange={(event) => setRevenueDelta(Number(event.target.value))}
                className="slider-pro mt-2 w-full accent-mint"
              />
            </label>
            <label className="rounded-xl border border-border-subtle bg-canvas-deep/50 p-3 text-xs text-slate-200">
              <span className="flex items-center justify-between">
                <span>営業利益成長補正</span>
                <span className="font-mono font-semibold text-blue">{opDelta > 0 ? "+" : ""}{opDelta}</span>
              </span>
              <input
                type="range"
                min={-30}
                max={30}
                value={opDelta}
                onChange={(event) => setOpDelta(Number(event.target.value))}
                className="slider-pro mt-2 w-full accent-blue"
              />
            </label>
            <label className="rounded-xl border border-border-subtle bg-canvas-deep/50 p-3 text-xs text-slate-200">
              <span className="flex items-center justify-between">
                <span>PER補正</span>
                <span className="font-mono font-semibold text-amber">{perDelta > 0 ? "+" : ""}{perDelta}</span>
              </span>
              <input
                type="range"
                min={-20}
                max={30}
                value={perDelta}
                onChange={(event) => setPerDelta(Number(event.target.value))}
                className="slider-pro mt-2 w-full accent-amber"
              />
            </label>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <div className="rounded-xl border border-border-subtle bg-canvas-deep/50 p-3 text-xs text-slate-200">
              <p className="text-text-muted">現在</p>
              <p className={clsx("mt-1 text-lg font-bold tabular-nums", zoneColor(stock.score))}>{stock.score}</p>
              <p className="mt-1 text-text-secondary">{formatActionLabel(stock.evaluatedAction)}</p>
            </div>
            <div className={clsx(
              "rounded-xl border p-3 text-xs text-slate-200 transition-all duration-300",
              bigChange ? "border-amber/40 shadow-glow-amber bg-canvas-deep/50" : "border-border-subtle bg-canvas-deep/50"
            )}>
              <p className="text-text-muted">シミュレーション後</p>
              <p className={clsx("mt-1 text-lg font-bold tabular-nums", simulated ? zoneColor(simulated.score) : "text-text-muted")}>
                {simulated?.score ?? "-"}
              </p>
              <p className="mt-1 text-text-secondary">{simulated ? formatActionLabel(simulated.evaluatedAction) : "-"}</p>
              <p className={clsx(
                "mt-1 font-mono text-[11px] font-semibold",
                scoreDiff > 0 ? "text-mint" : scoreDiff < 0 ? "text-danger" : "text-text-muted"
              )}>
                差分: {simulated ? `${scoreDiff > 0 ? "+" : ""}${scoreDiff}` : "-"}
              </p>
            </div>
          </div>

          <ImpactZone current={stock.score} simulated={simulated?.score ?? null} />
        </>
      )}
    </section>
  );
}

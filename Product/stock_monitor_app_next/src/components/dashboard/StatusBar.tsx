"use client";

import React from "react";
import clsx from "clsx";

import {
  dataSourceStatusBadgeClass,
  dataSourceStatusDotClass,
  dataSourceStatusLabel,
  resolveDataSourceStatus
} from "@/lib/dataSourceStatus";
import { DataMode, ProviderHealth } from "@/services/providers/types";
import { StockSourceMeta } from "@/types/source";

interface StatusBarProps {
  dataMode: DataMode;
  sourceMeta?: StockSourceMeta | null;
  health: ProviderHealth[];
  error: string | null;
  stockCount: number;
  lastUpdatedAt: string | null;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ja-JP");
}

function StatusBarInner({
  dataMode,
  sourceMeta,
  health,
  error,
  stockCount,
  lastUpdatedAt,
  isLoading,
  onRefresh
}: StatusBarProps): JSX.Element {
  const status = resolveDataSourceStatus({ dataMode, sourceMeta, health, error });
  const alphaVantageCalls = health.find((item) => item.provider === "alphaVantage")?.cumulativeCalls ?? 0;

  return (
    <section className="card-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px] md:text-xs">
        <span
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 font-medium",
            dataSourceStatusBadgeClass(status)
          )}
        >
          <span className={clsx("h-1.5 w-1.5 rounded-full", dataSourceStatusDotClass(status))} />
          {dataSourceStatusLabel(status)}
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-canvas-deep/60 px-3 py-1 text-text-secondary">
          取得銘柄数: <span className="font-mono tabular-nums text-text-primary">{stockCount}</span>
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-canvas-deep/60 px-3 py-1 text-text-secondary">
          AV累積コール数:{" "}
          <span className="font-mono tabular-nums text-text-primary">{alphaVantageCalls}</span>
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-canvas-deep/60 px-3 py-1 text-text-secondary">
          最終更新:{" "}
          <span className="font-mono tabular-nums text-text-primary">{formatDateTime(lastUpdatedAt)}</span>
        </span>

        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={isLoading}
          className="ml-auto rounded-lg border border-primary/35 bg-primary/10 px-3 py-1 font-medium text-primary transition-colors hover:border-primary/60 hover:bg-primary/20 disabled:opacity-50"
        >
          {isLoading ? "更新中..." : "手動更新"}
        </button>
      </div>
    </section>
  );
}

export const StatusBar = React.memo(StatusBarInner);


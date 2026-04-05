"use client";

import { useEffect, useState } from "react";

import clsx from "clsx";

import { DataMode, ProviderHealth } from "@/services/providers/types";

interface DataQualityRibbonProps {
  dataMode: DataMode;
  lastUpdatedAt: string | null;
  health: ProviderHealth[];
  isStale?: boolean;
  autoRefreshEnabled?: boolean;
  refreshIntervalMinutes?: number;
}

function modeLabel(mode: DataMode): string {
  if (mode === "live") return "LIVE";
  if (mode === "fallback") return "FALLBACK";
  return "MOCK";
}

function providerLabel(provider: ProviderHealth["provider"]): string {
  return provider === "jquants" ? "価格" : "財務";
}

function providerIcon(provider: ProviderHealth["provider"]): string {
  return provider === "jquants" ? "📊" : "📋";
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ja-JP");
}

function useElapsed(lastUpdatedAt: string | null): string {
  const [label, setLabel] = useState("-");

  useEffect(() => {
    const compute = (): void => {
      if (!lastUpdatedAt) { setLabel("-"); return; }
      const ts = Date.parse(lastUpdatedAt);
      if (Number.isNaN(ts)) { setLabel("-"); return; }
      const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
      if (diff < 60) { setLabel(`${diff}秒前`); return; }
      const min = Math.floor(diff / 60);
      if (min < 60) { setLabel(`${min}分前`); return; }
      const hr = Math.floor(min / 60);
      setLabel(`${hr}時間${min % 60}分前`);
    };
    compute();
    const timer = window.setInterval(compute, 10_000);
    return () => window.clearInterval(timer);
  }, [lastUpdatedAt]);

  return label;
}

function useNextRefreshLabel(
  lastUpdatedAt: string | null,
  autoRefreshEnabled: boolean,
  intervalMinutes: number
): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!autoRefreshEnabled || !lastUpdatedAt) { setLabel(null); return; }
    const compute = (): void => {
      const ts = Date.parse(lastUpdatedAt);
      if (Number.isNaN(ts)) { setLabel(null); return; }
      const nextTs = ts + intervalMinutes * 60 * 1000;
      const remain = Math.max(0, Math.floor((nextTs - Date.now()) / 1000));
      if (remain <= 0) { setLabel("まもなく"); return; }
      const m = Math.floor(remain / 60);
      const s = remain % 60;
      setLabel(m > 0 ? `${m}分${s}秒` : `${s}秒`);
    };
    compute();
    const timer = window.setInterval(compute, 1_000);
    return () => window.clearInterval(timer);
  }, [lastUpdatedAt, autoRefreshEnabled, intervalMinutes]);

  return label;
}

function StalenessBar({ lastUpdatedAt }: { lastUpdatedAt: string | null }): JSX.Element | null {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const compute = (): void => {
      if (!lastUpdatedAt) { setProgress(0); return; }
      const ts = Date.parse(lastUpdatedAt);
      if (Number.isNaN(ts)) { setProgress(0); return; }
      const elapsed = Date.now() - ts;
      const limit = 15 * 60 * 1000;
      setProgress(Math.min(1, elapsed / limit));
    };
    compute();
    const timer = window.setInterval(compute, 10_000);
    return () => window.clearInterval(timer);
  }, [lastUpdatedAt]);

  if (!lastUpdatedAt) return null;

  const color = progress < 0.5 ? "bg-mint" : progress < 1 ? "bg-amber" : "bg-danger";

  return (
    <div className="h-[2px] w-16 rounded-none bg-canvas-deep/80 overflow-hidden">
      <div
        className={clsx("h-full rounded-none transition-all duration-500", color)}
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}

export function DataQualityRibbon({
  dataMode,
  lastUpdatedAt,
  health,
  isStale = false,
  autoRefreshEnabled = false,
  refreshIntervalMinutes = 15
}: DataQualityRibbonProps): JSX.Element {
  const elapsed = useElapsed(lastUpdatedAt);
  const nextRefresh = useNextRefreshLabel(lastUpdatedAt, autoRefreshEnabled, refreshIntervalMinutes);

  return (
    <section
      className={clsx(
        "card-surface px-4 py-3 transition-all duration-300",
        isStale && "animate-pulse-soft"
      )}
    >
      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        {/* Data mode badge */}
        <span
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-none border px-3 py-1 font-medium",
            dataMode === "live" && "border-mint/25 bg-mint/8 text-mint",
            dataMode === "fallback" && "border-amber/25 bg-amber/8 text-amber",
            dataMode === "mock" && "border-border-subtle bg-canvas-raised/60 text-text-secondary"
          )}
        >
          <span
            className={clsx(
              "h-1.5 w-1.5 rounded-full",
              dataMode === "live" && "bg-mint",
              dataMode === "fallback" && "bg-amber",
              dataMode === "mock" && "bg-text-muted"
            )}
          />
          {modeLabel(dataMode)}
        </span>

        {/* Divider */}
        <span className="hidden h-4 w-px bg-border-subtle sm:block" />

        {/* Last updated with elapsed + progress bar */}
        <span className="inline-flex items-center gap-2 rounded-none border border-border-subtle bg-canvas-deep/50 px-3 py-1 text-text-muted">
          最終更新:
          <span className="font-mono-tech text-text-secondary">{formatDateTime(lastUpdatedAt)}</span>
          <span className={clsx("font-medium font-mono-tech", isStale ? "text-danger" : "text-text-secondary")}>
            ({elapsed})
          </span>
          <StalenessBar lastUpdatedAt={lastUpdatedAt} />
        </span>

        {/* Divider */}
        <span className="hidden h-4 w-px bg-border-subtle sm:block" />

        {/* Provider health badges */}
        {health.map((item) => (
          <span
            key={item.provider}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-none border px-3 py-1 font-medium",
              item.ok
                ? "border-border-subtle bg-canvas-deep/50 text-text-secondary"
                : "border-danger/25 bg-danger/8 text-danger"
            )}
          >
            <span className="text-[10px]">{providerIcon(item.provider)}</span>
            <span className={clsx("h-1.5 w-1.5 rounded-full", item.ok ? "bg-mint" : "bg-danger")} />
            {providerLabel(item.provider)}: {item.ok ? "正常" : "失敗"}
            {item.latencyMs != null && (
              <span className="font-mono-tech text-text-muted">({item.latencyMs}ms)</span>
            )}
          </span>
        ))}

        {/* Next refresh countdown */}
        {nextRefresh && (
          <>
            <span className="hidden h-4 w-px bg-border-subtle sm:block" />
            <span className="inline-flex items-center gap-1.5 rounded-none border border-blue/20 bg-blue/6 px-3 py-1 text-blue">
              ⏱ 次回更新: {nextRefresh}
            </span>
          </>
        )}
      </div>
    </section>
  );
}

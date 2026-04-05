import React, { useCallback, useMemo, useState } from "react";
import clsx from "clsx";

import { DataMode, ProviderHealth } from "@/services/providers/types";
import { EvaluatedStock } from "@/types/stock";

interface HealthResult {
  ok: boolean;
  latencyMs: number;
  error?: string;
}
type HealthResults = Record<string, HealthResult>;

interface SummaryBarProps {
  stocks: EvaluatedStock[];
  dataMode: DataMode;
  lastUpdatedAt: string | null;
  fallbackStartedAt: string | null;
  isLoading: boolean;
  isStale: boolean;
  error: string | null;
  fallbackReason: string | null;
  health: ProviderHealth[];
  onRefresh: () => Promise<void>;
}

function dataModeLabel(dataMode: DataMode): string {
  if (dataMode === "live") return "ライブ";
  if (dataMode === "fallback") return "フォールバック";
  return "モック";
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("ja-JP");
}

function formatDurationSince(value: string | null): string {
  if (!value) {
    return "-";
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "-";
  }
  const elapsedMs = Date.now() - parsed;
  if (elapsedMs < 0) {
    return "-";
  }
  const totalMinutes = Math.floor(elapsedMs / (60 * 1000));
  if (totalMinutes < 60) {
    return `${totalMinutes}分`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}時間${minutes}分` : `${hours}時間`;
}

function providerLabel(provider: ProviderHealth["provider"]): string {
  if (provider === "jquants") {
    return "価格データ（J-Quants）";
  }
  return "財務データ（EDINET DB）";
}

function shortProviderLabel(provider: ProviderHealth["provider"]): string {
  if (provider === "jquants") {
    return "価格";
  }
  return "財務";
}

function sourceStaleThresholdMs(provider: ProviderHealth["provider"]): number {
  if (provider === "jquants") {
    return 24 * 60 * 60 * 1000;
  }
  return 365 * 24 * 60 * 60 * 1000;
}

function isSourceStale(health: ProviderHealth): boolean {
  if (!health.sourceTimestamp) {
    return false;
  }
  const parsed = Date.parse(health.sourceTimestamp);
  if (Number.isNaN(parsed)) {
    return false;
  }
  return Date.now() - parsed > sourceStaleThresholdMs(health.provider);
}

function extractBackoffMinutes(message: string | null): number | null {
  if (!message) {
    return null;
  }
  const matched = message.match(/backoff active \((\d+)分後に再試行\)/);
  if (!matched) {
    return null;
  }
  const parsed = Number(matched[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function providerStatusLabel(item: ProviderHealth): string {
  if (item.ok) {
    return "正常";
  }
  const backoffMinutes = extractBackoffMinutes(item.message);
  if (backoffMinutes !== null) {
    return "待機中";
  }
  return "失敗";
}

function providerReasonLabel(item: ProviderHealth): string | null {
  if (item.ok) {
    return null;
  }
  const backoffMinutes = extractBackoffMinutes(item.message);
  if (backoffMinutes !== null) {
    return `API混雑のため再試行待機中（あと${backoffMinutes}分）`;
  }
  return item.message;
}

function ConnectionTest(): JSX.Element {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<HealthResults | null>(null);

  const runTest = useCallback(async () => {
    setTesting(true);
    setResults(null);
    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as HealthResults;
      setResults(data);
      setTimeout(() => setResults(null), 10000);
    } catch {
      setResults({ _error: { ok: false, latencyMs: 0, error: "接続テスト失敗" } });
      setTimeout(() => setResults(null), 10000);
    } finally {
      setTesting(false);
    }
  }, []);

  const providerNames: Record<string, string> = {
    jquants: "J-Quants",
    edinetDb: "EDINET",
    yahoo: "Yahoo",
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void runTest()}
        disabled={testing}
        className="rounded-none border border-border-subtle px-3 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:border-border-active hover:text-text-primary disabled:opacity-50"
      >
        {testing ? "テスト中..." : "接続テスト"}
      </button>
      {results &&
        Object.entries(results)
          .filter(([key]) => key !== "_error")
          .map(([key, val]) => (
            <span
              key={key}
              className={clsx(
                "inline-flex items-center gap-1 text-[11px]",
                val.ok ? "text-mint" : "text-danger"
              )}
            >
              <span
                className={clsx(
                  "h-1.5 w-1.5 rounded-full",
                  val.ok ? "bg-mint" : "bg-danger"
                )}
              />
              {providerNames[key] ?? key} {val.latencyMs}ms
            </span>
          ))}
      {results?._error && (
        <span className="text-[11px] text-danger">{results._error.error}</span>
      )}
    </div>
  );
}

function SummaryBarInner({
  stocks,
  dataMode,
  lastUpdatedAt,
  fallbackStartedAt,
  isLoading,
  isStale,
  error,
  fallbackReason,
  health,
  onRefresh
}: SummaryBarProps): JSX.Element {
  const narrativeText = useMemo(() => {
    const buy = stocks.filter((stock) => stock.evaluatedAction === "buy_now").map((stock) => stock.name);
    const wait = stocks.filter((stock) => stock.evaluatedAction === "wait_earnings").map((stock) => stock.name);
    const dip = stocks.filter((stock) => stock.evaluatedAction === "wait_pullback").map((stock) => stock.name);

    return stocks.length === 0
      ? "条件に合う銘柄がありません。価格帯や成長率の条件を少し緩めて、候補を再評価してください。"
      : `現在 ${stocks.length} 銘柄。${buy.length ? `今買うは ${buy.join("、")}。` : ""}${wait.length ? `決算待ちは ${wait.join("、")}。` : ""}${dip.length ? `押し目待ちは ${dip.join("、")}。` : ""}数字と散文を並べて、壊れ方まで先に点検する設計です。`;
  }, [stocks]);
  const sourceStaleProviders = health.filter((item) => isSourceStale(item)).map((item) => item.provider);
  const fallbackOngoing = dataMode === "fallback" || dataMode === "mock";
  const providerStatusSummary = health
    .map((item) => {
      const backoffMinutes = extractBackoffMinutes(item.message);
      if (item.ok) {
        return `${shortProviderLabel(item.provider)}: 正常`;
      }
      if (backoffMinutes !== null) {
        return `${shortProviderLabel(item.provider)}: 待機中（あと${backoffMinutes}分）`;
      }
      return `${shortProviderLabel(item.provider)}: 失敗`;
    })
    .join(" / ");

  return (
    <section className="card-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-heading text-text-primary font-orb">全体サマリー</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-none border px-3 py-1 text-[11px] font-medium",
              dataMode === "live" && "border-mint/30 bg-mint/8 text-mint",
              dataMode === "fallback" && "border-amber/30 bg-amber/8 text-amber",
              dataMode === "mock" && "border-border-subtle bg-canvas-raised/60 text-text-secondary"
            )}
          >
            <span className={clsx(
              "h-1.5 w-1.5 rounded-full",
              dataMode === "live" && "bg-mint",
              dataMode === "fallback" && "bg-amber",
              dataMode === "mock" && "bg-text-muted"
            )} />
            データモード: {dataModeLabel(dataMode)}
          </span>
          {isStale ? (
            <span className="inline-flex items-center gap-1.5 rounded-none border border-amber/30 bg-amber/8 px-3 py-1 text-[11px] font-medium text-amber">
              <span className="h-1.5 w-1.5 rounded-full bg-amber" />
              取得時刻が古い
            </span>
          ) : null}
          {sourceStaleProviders.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-none border border-danger/30 bg-danger/8 px-3 py-1 text-[11px] font-medium text-danger">
              <span className="h-1.5 w-1.5 rounded-full bg-danger" />
              元データが古い可能性
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={isLoading}
            className="rounded-none border border-border-subtle px-3 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:border-border-active hover:text-text-primary disabled:opacity-50"
          >
            {isLoading ? "読み込み中..." : "再取得"}
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-text-muted">最終更新: <span className="font-mono-tech text-text-secondary">{formatDateTime(lastUpdatedAt)}</span></p>
      {providerStatusSummary ? (
        <p className="mt-1 text-xs text-text-muted">取得状況: <span className="text-text-secondary">{providerStatusSummary}</span></p>
      ) : null}
      {fallbackOngoing && fallbackStartedAt ? (
        <p className="mt-1 text-xs text-amber">フォールバック継続: {formatDurationSince(fallbackStartedAt)}</p>
      ) : null}
      <p className="mt-3 text-sm leading-7 text-text-secondary md:text-base">{narrativeText}</p>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {health.map((item) => (
          <div
            key={item.provider}
            className={clsx(
              "rounded-none border px-3 py-2.5 text-xs",
              item.ok ? "border-border-subtle bg-canvas-deep/50 text-text-secondary" : "border-amber/25 bg-amber/5 text-amber"
            )}
          >
            <p className="flex items-center gap-1.5 font-medium">
              <span className={clsx("h-1.5 w-1.5 rounded-full", item.ok ? "bg-mint" : "bg-amber")} />
              {providerLabel(item.provider)}
            </p>
            <p className="mt-1">状態: <span className="text-text-primary">{providerStatusLabel(item)}</span></p>
            <p>最終更新: <span className="font-mono-tech text-text-primary">{formatDateTime(item.sourceTimestamp)}</span></p>
            {item.sourceLabel ? <p>取得元: {item.sourceLabel}</p> : null}
            {providerReasonLabel(item) ? <p className="mt-1">理由: {providerReasonLabel(item)}</p> : null}
          </div>
        ))}
      </div>

      {dataMode === "fallback" || dataMode === "mock" || error ? (
        <div className="mt-4 rounded-none border border-amber/25 bg-amber/5 px-3 py-2 text-sm text-amber">
          {fallbackReason ?? "実データの取得に失敗したため、補助データを表示しています。"}
        </div>
      ) : null}

      {error ? (
        <details className="mt-2 rounded-none border border-border-subtle bg-canvas-deep/60 px-3 py-2 text-xs text-text-secondary">
          <summary className="cursor-pointer text-text-secondary">詳細ログを表示</summary>
          <p className="mt-2 whitespace-pre-wrap break-all text-danger">{error}</p>
        </details>
      ) : null}
      <p className="mt-2 text-xs text-text-muted">更新目安: 価格 5〜15分 / 財務 30〜60分</p>
      <p className="mt-3 text-xs text-text-muted">価格: J-Quants / 財務: EDINET DB</p>
      <ConnectionTest />
    </section>
  );
}

export const SummaryBar = React.memo(SummaryBarInner);

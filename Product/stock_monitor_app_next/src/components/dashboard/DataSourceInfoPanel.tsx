"use client";

import { useEffect, useMemo, useState } from "react";

import { ProviderHealth } from "@/services/providers/types";
import { DataSourceInfoView } from "@/types/dataSourceInfo";

interface DataSourceInfoPanelProps {
  health: ProviderHealth[];
}

export function DataSourceInfoPanel({ health }: DataSourceInfoPanelProps): JSX.Element {
  const [info, setInfo] = useState<DataSourceInfoView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load(): Promise<void> {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("/api/data-source-info", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = (await response.json()) as DataSourceInfoView;
        setInfo(payload);
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }
        const message = fetchError instanceof Error ? fetchError.message : "取得に失敗しました";
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  const alphaCumulativeCalls = useMemo(() => {
    const alphaHealth = health.find((item) => item.provider === "alphaVantage");
    return typeof alphaHealth?.cumulativeCalls === "number" ? alphaHealth.cumulativeCalls : null;
  }, [health]);

  return (
    <section className="rounded-lg border border-border-subtle bg-panel p-5 shadow-card">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-text-primary">データソース情報</h2>
        <p className="text-xs text-text-muted">YF/AV の役割、キャッシュ戦略、APIキー管理ルールを表示します。</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-secondary">情報を読み込み中...</p>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-amber/25 bg-amber/5 px-3 py-2 text-xs text-amber">
          データソース情報の取得に失敗しました: {error}
        </div>
      ) : null}

      {info ? (
        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-lg border border-border-subtle bg-canvas-deep/60 p-3 text-xs text-text-primary">
            <p className="font-semibold text-text-primary">YF / AV の役割</p>
            <p className="mt-2 text-text-secondary">YF: {info.roles.yf}</p>
            <p className="mt-1 text-text-secondary">AV: {info.roles.av}</p>
          </article>

          <article className="rounded-lg border border-border-subtle bg-canvas-deep/60 p-3 text-xs text-text-primary">
            <p className="font-semibold text-text-primary">キャッシュ戦略</p>
            <ul className="mt-2 space-y-1 text-text-secondary">
              {info.cacheStrategy.map((line) => (
                <li key={line}>・{line}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-lg border border-border-subtle bg-canvas-deep/60 p-3 text-xs text-text-primary md:col-span-2">
            <p className="font-semibold text-text-primary">APIキー / コール上限ガイド</p>
            <p className="mt-2 text-text-secondary">
              ALPHA_VANTAGE_API_KEY サフィックス:
              <span className="ml-1 font-mono tabular-nums text-text-primary">{info.apiKeySuffix}</span>
            </p>
            <p className="mt-1 text-text-secondary">
              AV 累積コール（起動後）:
              <span className="ml-1 font-mono tabular-nums text-text-primary">
                {alphaCumulativeCalls !== null ? alphaCumulativeCalls : "-"}
              </span>
            </p>
            <ul className="mt-2 space-y-1 text-text-secondary">
              {info.callLimitGuidance.map((line) => (
                <li key={line}>・{line}</li>
              ))}
            </ul>
          </article>
        </div>
      ) : null}
    </section>
  );
}

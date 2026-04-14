import clsx from "clsx";

import type { ConnectionState, TraderHealthViewModel } from "@/types/trader";

interface StatusHeaderProps {
  connectionState: ConnectionState;
  lastUpdatedAt: string | null;
  health: TraderHealthViewModel;
}

function formatConnectionState(value: ConnectionState): string {
  switch (value) {
    case "connected":
      return "接続中";
    case "reconnecting":
      return "再接続中";
    case "stale":
      return "停滞";
    default:
      return "初回待機";
  }
}

function formatUpdatedAt(value: string | null): string {
  if (!value) {
    return "最終更新 未取得";
  }

  return `最終更新 ${value}`;
}

function formatHealthLine(connectionState: ConnectionState, health: TraderHealthViewModel): string {
  if (health.fetchState === "unreachable") {
    return "backend 応答なし";
  }
  if (connectionState === "stale") {
    return "価格更新が停滞";
  }
  if (health.snapshot?.aiStatus === "degraded") {
    return "AI判断が劣化中";
  }
  if (health.snapshot?.lastWarning != null) {
    return "参照価格なしで継続";
  }
  if (health.snapshot?.referenceStatus === "degraded") {
    return "参照価格なしで継続";
  }
  if (health.fetchState === "ready") {
    return "server 正常";
  }
  return "backend 状態確認中";
}

function formatModeLine(health: TraderHealthViewModel): string {
  if (health.snapshot?.mode === "live") {
    if (health.snapshot.orderMode === "broker_auto") {
      return health.snapshot.liveArmed ? "live 設定 / 自動発注arm済み" : "live 設定 / armed 待ち";
    }
    return "live 設定 / 発注停止";
  }

  return "紙運用 / 実発注なし";
}

export function StatusHeader({ connectionState, lastUpdatedAt, health }: StatusHeaderProps): JSX.Element {
  return (
    <header className="dashboard-header panel">
      <div>
        <p className="panel-eyebrow">監視コンソール</p>
        <h1>AutoTrader ダッシュボード</h1>
        <p className="status-mode">{formatModeLine(health)}</p>
      </div>

      <div className="status-stack">
        <span className={clsx("status-pill", `status-pill--${connectionState}`)}>
          {formatConnectionState(connectionState)}
        </span>
        <p className="status-health">{formatHealthLine(connectionState, health)}</p>
        <p className="status-updated-at">{formatUpdatedAt(lastUpdatedAt)}</p>
      </div>
    </header>
  );
}
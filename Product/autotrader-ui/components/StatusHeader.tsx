import clsx from "clsx";

import type { ConnectionState } from "@/types/trader";

interface StatusHeaderProps {
  connectionState: ConnectionState;
  lastUpdatedAt: string | null;
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

export function StatusHeader({ connectionState, lastUpdatedAt }: StatusHeaderProps): JSX.Element {
  return (
    <header className="dashboard-header panel">
      <div>
        <p className="panel-eyebrow">監視コンソール</p>
        <h1>AutoTrader ダッシュボード</h1>
      </div>

      <div className="status-stack">
        <span className={clsx("status-pill", `status-pill--${connectionState}`)}>
          {formatConnectionState(connectionState)}
        </span>
        <p className="status-updated-at">{formatUpdatedAt(lastUpdatedAt)}</p>
      </div>
    </header>
  );
}
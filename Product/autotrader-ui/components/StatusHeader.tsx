import clsx from "clsx";

import type { ConnectionState } from "@/types/trader";

interface StatusHeaderProps {
  connectionState: ConnectionState;
  lastUpdatedAt: string | null;
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
        <p className="panel-eyebrow">Monitor Console</p>
        <h1>AutoTrader Dashboard</h1>
      </div>

      <div className="status-stack">
        <span className={clsx("status-pill", `status-pill--${connectionState}`)}>{connectionState}</span>
        <p className="status-updated-at">{formatUpdatedAt(lastUpdatedAt)}</p>
      </div>
    </header>
  );
}
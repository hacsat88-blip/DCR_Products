import type { ConnectionState, TraderHealthViewModel } from "@/types/trader";

interface PaperOpsSummaryProps {
  connectionState: ConnectionState;
  health: TraderHealthViewModel;
}

function describeOperationalState(
  connectionState: ConnectionState,
  health: TraderHealthViewModel
): string {
  if (health.fetchState === "unreachable") {
    return "backend 応答なし";
  }

  if (connectionState === "stale") {
    return "価格更新が停滞";
  }

  if (health.snapshot === null) {
    return "backend 状態確認中";
  }

  if (health.snapshot.aiStatus === "degraded") {
    return "AI判断が劣化中";
  }

  if (health.snapshot.lastWarning != null) {
    return "参照価格なしで継続";
  }

  if (health.snapshot.referenceStatus === "degraded") {
    return "参照価格なしで継続";
  }

  return "server 正常";
}

function formatLastTick(health: TraderHealthViewModel): string {
  if (health.snapshot?.lastPriceTickAt === null || health.snapshot?.lastPriceTickAt === undefined) {
    return "未取得";
  }

  if (!health.snapshot.lastPriceCode) {
    return health.snapshot.lastPriceTickAt;
  }

  return `${health.snapshot.lastPriceTickAt} / ${health.snapshot.lastPriceCode}`;
}

function formatReadiness(value: "ready" | "degraded" | null | undefined): string {
  if (value === "ready") {
    return "準備完了";
  }
  if (value === "degraded") {
    return "劣化";
  }
  return "未取得";
}

export function PaperOpsSummary({ connectionState, health }: PaperOpsSummaryProps): JSX.Element {
  const summary = describeOperationalState(connectionState, health);

  return (
    <section className="panel metric-panel">
      <p className="panel-eyebrow">Paper Ops</p>
      <div className="panel-heading-row">
        <h2>運用状態</h2>
        <span className="panel-count">stub only</span>
      </div>
      <p className="metric-value">{summary}</p>
      <p className="metric-subtle">紙運用 / 実発注なし</p>
      <dl className="metric-grid metric-grid--two-columns">
        <div>
          <dt>AI</dt>
          <dd>{formatReadiness(health.snapshot?.aiStatus)}</dd>
        </div>
        <div>
          <dt>参照</dt>
          <dd>{formatReadiness(health.snapshot?.referenceStatus)}</dd>
        </div>
        <div>
          <dt>最終 tick</dt>
          <dd>{formatLastTick(health)}</dd>
        </div>
        <div>
          <dt>health</dt>
          <dd>{health.fetchState === "ready" ? health.snapshot?.status ?? "未取得" : health.fetchState}</dd>
        </div>
      </dl>
      {health.snapshot?.lastWarning ? <p className="ops-warning">{health.snapshot.lastWarning}</p> : null}
    </section>
  );
}
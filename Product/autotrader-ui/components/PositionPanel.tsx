import type { TraderPositionSnapshot } from "@/types/trader";

interface PositionPanelProps {
  position: TraderPositionSnapshot;
}

function formatQty(value: number | null): string {
  if (value === null) {
    return "未取得";
  }

  return `${value}株`;
}

function formatNumber(value: number | null): string {
  if (value === null) {
    return "未取得";
  }

  return `¥${value.toFixed(2)}`;
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return "未取得";
  }

  return `${value.toFixed(2)}%`;
}

export function PositionPanel({ position }: PositionPanelProps): JSX.Element {
  return (
    <section className="panel metric-panel">
      <p className="panel-eyebrow">ポジション</p>
      <h2>保有状況</h2>
      <dl className="metric-grid metric-grid--two-columns">
        <div>
          <dt>数量</dt>
          <dd>{formatQty(position.qty)}</dd>
        </div>
        <div>
          <dt>平均取得</dt>
          <dd>{formatNumber(position.avgCost)}</dd>
        </div>
        <div>
          <dt>損益</dt>
          <dd>{formatNumber(position.pnl)}</dd>
        </div>
        <div>
          <dt>損益率</dt>
          <dd>{formatPercent(position.pnlPct)}</dd>
        </div>
      </dl>
    </section>
  );
}
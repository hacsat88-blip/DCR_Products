import type { TraderRiskRuntimeSnapshot } from "@/types/trader";

interface RiskRuntimePanelProps {
  risk: TraderRiskRuntimeSnapshot | null;
}

function formatCurrency(value: number | null): string {
  if (value === null) {
    return "未取得";
  }

  return `¥${value.toFixed(2)}`;
}

function formatInteger(value: number | null, suffix = ""): string {
  if (value === null) {
    return "未取得";
  }

  return `${value}${suffix}`;
}

function formatCooldown(value: number | null): string {
  if (value === null) {
    return "未取得";
  }
  if (value <= 0) {
    return "なし";
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function RiskRuntimePanel({ risk }: RiskRuntimePanelProps): JSX.Element {
  return (
    <section className="panel metric-panel">
      <p className="panel-eyebrow">運用リスク</p>
      <h2>ランタイム状態</h2>
      <dl className="metric-grid metric-grid--two-columns">
        <div>
          <dt>当日実現損益</dt>
          <dd>{formatCurrency(risk?.dailyRealizedPnl ?? null)}</dd>
        </div>
        <div>
          <dt>当日注文数</dt>
          <dd>{formatInteger(risk?.dailyOrderCount ?? null, "件")}</dd>
        </div>
        <div>
          <dt>連敗数</dt>
          <dd>{formatInteger(risk?.consecutiveLossCount ?? null, "回")}</dd>
        </div>
        <div>
          <dt>クールダウン</dt>
          <dd>{formatCooldown(risk?.cooldownRemainingSec ?? null)}</dd>
        </div>
      </dl>
      <p className="metric-subtle">{risk?.entryBlocked ? risk.entryBlockReason ?? "新規停止中" : "新規建て可能"}</p>
    </section>
  );
}
import { getFeedRoleLabel, getFeedSourceLabel } from "@/lib/trader-display";
import type { ConnectionState, TraderPriceSnapshot } from "@/types/trader";

interface PricePanelProps {
  executionPrice: TraderPriceSnapshot;
  referencePrice: TraderPriceSnapshot;
  connectionState: ConnectionState;
}

function formatCurrency(value: number | null): string {
  if (value === null) {
    return "ティック待機中";
  }

  return `¥${value.toFixed(2)}`;
}

function formatVolume(value: number | null): string {
  if (value === null) {
    return "未取得";
  }

  return value.toLocaleString("ja-JP");
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

export function PricePanel({ executionPrice, referencePrice, connectionState }: PricePanelProps): JSX.Element {
  const feedRoleLabel = getFeedRoleLabel(executionPrice.feedRole);
  const feedSourceLabel = getFeedSourceLabel(executionPrice.feedSource);
  const feedLabel =
    feedRoleLabel && feedSourceLabel ? `${feedRoleLabel} / ${feedSourceLabel}` : "フィード未取得";
  const referenceRoleLabel = getFeedRoleLabel(referencePrice.feedRole);
  const referenceSourceLabel = getFeedSourceLabel(referencePrice.feedSource);
  const referenceLabel =
    referenceRoleLabel && referenceSourceLabel
      ? `${referenceRoleLabel} / ${referenceSourceLabel}`
      : "参照フィード未取得";
  const referenceValue =
    referencePrice.current === null ? "未取得" : formatCurrency(referencePrice.current);

  return (
    <section className="panel metric-panel">
      <p className="panel-eyebrow">価格フィード</p>
      <div className="panel-heading-row">
        <h2>現在値</h2>
        <span className="panel-code">{executionPrice.code ?? "----"}</span>
      </div>
      <p className="metric-value">{formatCurrency(executionPrice.current)}</p>
      <p className="metric-subtle">{feedLabel}</p>
      <div className="metric-reference-block">
        <p className="metric-reference-value">参照価格 {referenceValue}</p>
        <p className="metric-reference-source">{referenceLabel}</p>
      </div>
      <dl className="metric-grid">
        <div>
          <dt>出来高</dt>
          <dd>{formatVolume(executionPrice.volume)}</dd>
        </div>
        <div>
          <dt>接続</dt>
          <dd>{formatConnectionState(connectionState)}</dd>
        </div>
      </dl>
    </section>
  );
}
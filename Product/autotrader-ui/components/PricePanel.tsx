import type { ConnectionState, TraderPriceSnapshot } from "@/types/trader";

interface PricePanelProps {
  price: TraderPriceSnapshot;
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

function formatFeedRole(value: TraderPriceSnapshot["feedRole"]): string | null {
  switch (value) {
    case "execution":
      return "執行";
    case "reference":
      return "参照";
    default:
      return null;
  }
}

export function PricePanel({ price, connectionState }: PricePanelProps): JSX.Element {
  const feedRoleLabel = formatFeedRole(price.feedRole);
  const feedLabel =
    feedRoleLabel && price.feedSource ? `${feedRoleLabel} / ${price.feedSource}` : "フィード未取得";

  return (
    <section className="panel metric-panel">
      <p className="panel-eyebrow">価格フィード</p>
      <div className="panel-heading-row">
        <h2>現在値</h2>
        <span className="panel-code">{price.code ?? "----"}</span>
      </div>
      <p className="metric-value">{formatCurrency(price.current)}</p>
      <p className="metric-subtle">{feedLabel}</p>
      <dl className="metric-grid">
        <div>
          <dt>出来高</dt>
          <dd>{formatVolume(price.volume)}</dd>
        </div>
        <div>
          <dt>接続</dt>
          <dd>{formatConnectionState(connectionState)}</dd>
        </div>
      </dl>
    </section>
  );
}
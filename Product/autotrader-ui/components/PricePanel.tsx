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

export function PricePanel({ price, connectionState }: PricePanelProps): JSX.Element {
  const feedLabel =
    price.feedRole && price.feedSource ? `${price.feedRole} / ${price.feedSource}` : "feed 未取得";

  return (
    <section className="panel metric-panel">
      <p className="panel-eyebrow">Price Feed</p>
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
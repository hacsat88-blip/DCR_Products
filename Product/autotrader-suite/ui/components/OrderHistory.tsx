import { getActionLabel, getFeedSourceLabel } from "@/lib/trader-display";
import type { TraderEventSnapshot } from "@/types/trader";

interface OrderHistoryProps {
  events: TraderEventSnapshot[];
}

export function OrderHistory({ events }: OrderHistoryProps): JSX.Element {
  return (
    <section className="panel history-panel">
      <div className="panel-heading-row">
        <h2>発注履歴</h2>
        <span className="panel-count">{events.length}件</span>
      </div>

      {events.length === 0 ? (
        <p className="empty-copy">注文イベントなし</p>
      ) : (
        <ul className="history-list">
          {events.map((event, index) => (
            <li key={`${event.at}-${event.action}-${index}`} className="history-row">
              <span className="history-row__meta">{getActionLabel(event.action)}</span>
              <span className="history-row__body">{`${event.at || "--:--:--"} / ${event.qty}株 / ${getFeedSourceLabel(event.feedSource) ?? "-"}`}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
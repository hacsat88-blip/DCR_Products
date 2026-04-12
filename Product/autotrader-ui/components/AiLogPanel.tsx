import type { TraderEventSnapshot } from "@/types/trader";

interface AiLogPanelProps {
  events: TraderEventSnapshot[];
}

export function AiLogPanel({ events }: AiLogPanelProps): JSX.Element {
  return (
    <section className="panel history-panel">
      <div className="panel-heading-row">
        <h2>AI判断ログ</h2>
        <span className="panel-count">{events.length}件</span>
      </div>

      {events.length === 0 ? (
        <p className="empty-copy">ログ待機中</p>
      ) : (
        <ul className="history-list">
          {events.map((event, index) => (
            <li key={`${event.at}-${event.action}-${index}`} className="history-row">
              <span className="history-row__meta">{event.feedRole ?? "-"}</span>
              <span className="history-row__body">{`${event.at || "--:--:--"} / ${event.reason}`}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
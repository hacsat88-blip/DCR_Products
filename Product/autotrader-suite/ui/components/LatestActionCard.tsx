import clsx from "clsx";

import { getActionLabel, getFeedSourceLabel } from "@/lib/trader-display";
import type { TraderEventSnapshot } from "@/types/trader";

interface LatestActionCardProps {
  event: TraderEventSnapshot;
}

function getFeedBadgeLabel(event: TraderEventSnapshot): string | null {
  if (event.feedRole === "reference") {
    return "参照";
  }

  if (event.feedRole === "execution") {
    return "執行";
  }

  return null;
}

export function LatestActionCard({ event }: LatestActionCardProps): JSX.Element {
  const feedBadge = getFeedBadgeLabel(event);

  return (
    <section className="panel metric-panel">
      <p className="panel-eyebrow">判断結果</p>
      <div className="panel-heading-row">
        <h2>最新イベント</h2>
        {feedBadge ? (
          <span className={clsx("feed-badge", `feed-badge--${event.feedRole}`)}>{feedBadge}</span>
        ) : null}
      </div>
      <p className="event-reason">{event.reason}</p>
      <dl className="metric-grid metric-grid--two-columns">
        <div>
          <dt>判定</dt>
          <dd>{getActionLabel(event.action)}</dd>
        </div>
        <div>
          <dt>数量</dt>
          <dd>{event.qty > 0 ? `${event.qty}` : "-"}</dd>
        </div>
        <div>
          <dt>時刻</dt>
          <dd>{event.at || "--:--:--"}</dd>
        </div>
        <div>
          <dt>ソース</dt>
          <dd>{getFeedSourceLabel(event.feedSource) ?? "未取得"}</dd>
        </div>
      </dl>
    </section>
  );
}
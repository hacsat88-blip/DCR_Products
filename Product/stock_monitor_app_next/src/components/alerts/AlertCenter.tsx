import React, { useMemo, useState } from "react";
import clsx from "clsx";

import { AlertEvent } from "@/types/alert";
import { EvaluatedStock } from "@/types/stock";

interface AlertCenterProps {
  events: AlertEvent[];
  stocks: EvaluatedStock[];
  lastEvaluationAt: string | null;
  onMarkRead: (eventId: string) => void;
  onDismiss: (eventId: string) => void;
  onClear: () => void;
}

function severityTone(severity: AlertEvent["severity"]): string {
  if (severity === "critical") return "border-danger/60 bg-danger/15 text-danger";
  if (severity === "warning") return "border-amber/60 bg-amber/10 text-amber";
  return "border-secondary/50 bg-secondary/10 text-secondary";
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ja-JP");
}

function payloadPriority(payload: Record<string, unknown> | undefined): "high" | "medium" | "low" {
  const priority = payload?.priority;
  if (priority === "high" || priority === "medium" || priority === "low") {
    return priority;
  }
  return "medium";
}

function priorityLabel(priority: "high" | "medium" | "low"): string {
  if (priority === "high") return "優先:高";
  if (priority === "low") return "優先:低";
  return "優先:中";
}

function priorityTone(priority: "high" | "medium" | "low"): string {
  if (priority === "high") return "border-rose-300/50 bg-rose-500/10 text-rose-200";
  if (priority === "low") return "border-slate-500 bg-canvas-deep/70 text-slate-200";
  return "border-secondary/50 bg-secondary/10 text-secondary";
}

function payloadDueDate(payload: Record<string, unknown> | undefined): string | null {
  const dueDate = payload?.dueDate;
  return typeof dueDate === "string" && dueDate.trim() ? dueDate : null;
}

const ALERT_PAGE_SIZE = 20;

function AlertCenterInner({
  events,
  stocks,
  lastEvaluationAt,
  onMarkRead,
  onDismiss,
  onClear
}: AlertCenterProps): JSX.Element {
  const [visibleCount, setVisibleCount] = useState(ALERT_PAGE_SIZE);
  const stockNameMap = useMemo(
    () => new Map(stocks.map((stock) => [stock.code, stock.name])),
    [stocks]
  );
  const sorted = useMemo(
    () => [...events].sort((a, b) => Date.parse(b.triggeredAt) - Date.parse(a.triggeredAt)),
    [events]
  );
  const unreadCount = useMemo(
    () => sorted.filter((event) => !event.read && !event.dismissed).length,
    [sorted]
  );
  const visibleEvents = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  return (
    <section className="rounded-lg border border-border-subtle bg-panel p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">アラートセンター</h2>
          <p className="text-xs text-text-muted">未読 {unreadCount} / 最終評価: {formatDateTime(lastEvaluationAt)}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-slate-200"
        >
          履歴をクリア
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-canvas-deep/60 px-4 py-5 text-sm text-text-secondary">
          現在アラートはありません。再取得後に変化検知を実行します。
        </div>
      ) : (
        <div className="grid gap-2">
          {visibleEvents.map((event) => (
            <article
              key={event.id}
              className={clsx(
                "rounded-lg border px-3 py-3",
                event.dismissed
                  ? "border-border-subtle bg-canvas-deep/40 opacity-60"
                  : "border-border-subtle bg-canvas-deep/65"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={clsx("rounded-lg border px-2 py-1 text-[11px] font-semibold", severityTone(event.severity))}>
                    {event.severity.toUpperCase()}
                  </span>
                  <span
                    className={clsx(
                      "rounded-lg border px-2 py-1 text-[11px] font-semibold",
                      priorityTone(payloadPriority(event.payload))
                    )}
                  >
                    {priorityLabel(payloadPriority(event.payload))}
                  </span>
                  <p className="text-sm font-semibold text-text-primary">{event.title}</p>
                </div>
                <p className="text-xs font-mono tabular-nums text-text-muted">{formatDateTime(event.triggeredAt)}</p>
              </div>

              <p className="mt-2 text-xs text-text-secondary">
                {event.stockCode ? `${event.stockCode} ${stockNameMap.get(event.stockCode) ?? ""}` : "全体"}
              </p>
              {payloadDueDate(event.payload) ? (
                <p className="mt-1 text-xs text-amber">対応目安: {payloadDueDate(event.payload)}</p>
              ) : null}
              <p className="mt-2 text-sm leading-6 text-slate-200">{event.message}</p>

              <div className="mt-3 flex items-center gap-2">
                {!event.read ? (
                  <button
                    type="button"
                    onClick={() => onMarkRead(event.id)}
                    className="rounded-lg border border-border-subtle px-2 py-1 text-xs text-slate-200"
                  >
                    既読
                  </button>
                ) : null}
                {!event.dismissed ? (
                  <button
                    type="button"
                    onClick={() => onDismiss(event.id)}
                    className="rounded-lg border border-border-subtle px-2 py-1 text-xs text-slate-200"
                  >
                    非表示
                  </button>
                ) : (
                  <span className="text-xs text-text-muted">非表示済み</span>
                )}
              </div>
            </article>
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + ALERT_PAGE_SIZE)}
              className="mt-2 w-full rounded-lg border border-border-subtle py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-400"
            >
              もっと見る（残り {sorted.length - visibleCount} 件）
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export const AlertCenter = React.memo(AlertCenterInner);

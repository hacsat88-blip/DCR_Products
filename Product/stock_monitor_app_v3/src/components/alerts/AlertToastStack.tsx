"use client";

import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";

import { AlertEvent } from "@/types/alert";

interface AlertToastStackProps {
  events: AlertEvent[];
  onDismiss?: (eventId: string) => void;
}

function tone(severity: AlertEvent["severity"]): string {
  if (severity === "critical") return "border-danger/60 bg-danger/20 text-danger";
  if (severity === "warning") return "border-amber/60 bg-amber/20 text-amber";
  return "border-blue/60 bg-blue/20 text-blue";
}

const TOAST_TTL_MS = 12_000;

export function AlertToastStack({ events, onDismiss }: AlertToastStackProps): JSX.Element {
  const [visible, setVisible] = useState<AlertEvent[]>([]);
  const isFirst = useRef(true);
  const seenIds = useRef<Set<string>>(new Set());
  const timersRef = useRef<Map<string, number>>(new Map());

  const clearToastTimer = useCallback((eventId: string): void => {
    const timer = timersRef.current.get(eventId);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(eventId);
    }
  }, []);

  const removeToast = useCallback((eventId: string): void => {
    clearToastTimer(eventId);
    setVisible((current) => current.filter((item) => item.id !== eventId));
  }, [clearToastTimer]);

  const scheduleToastAutoHide = useCallback((eventId: string): void => {
    clearToastTimer(eventId);
    const timer = window.setTimeout(() => {
      removeToast(eventId);
    }, TOAST_TTL_MS);
    timersRef.current.set(eventId, timer);
  }, [clearToastTimer, removeToast]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  useEffect(() => {
    const latestMap = new Map(events.map((event) => [event.id, event]));
    setVisible((current) =>
      current.filter((item) => {
        const latest = latestMap.get(item.id);
        if (!latest || latest.dismissed) {
          clearToastTimer(item.id);
          return false;
        }
        return true;
      })
    );

    if (isFirst.current) {
      isFirst.current = false;
      events.forEach((event) => seenIds.current.add(event.id));
      return;
    }

    const incoming = events.filter((event) => !seenIds.current.has(event.id) && !event.dismissed);
    if (incoming.length === 0) {
      return;
    }
    incoming.forEach((event) => seenIds.current.add(event.id));
    setVisible((current) => {
      const merged = [...incoming, ...current].slice(0, 3);
      const visibleIds = new Set(merged.map((item) => item.id));
      timersRef.current.forEach((timer, id) => {
        if (!visibleIds.has(id)) {
          window.clearTimeout(timer);
          timersRef.current.delete(id);
        }
      });
      return merged;
    });

    incoming.forEach((event) => scheduleToastAutoHide(event.id));
  }, [clearToastTimer, events, scheduleToastAutoHide]);

  if (visible.length === 0) {
    return <></>;
  }

  return (
    <div className="fixed right-3 top-3 z-50 grid w-[min(360px,calc(100vw-24px))] gap-2 md:right-6 md:top-6">
      {visible.map((event) => (
        <article
          key={event.id}
          className={clsx("rounded-xl border px-3 py-3 shadow-2xl backdrop-blur", tone(event.severity))}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold">{event.title}</p>
            <button
              type="button"
              onClick={() => {
                removeToast(event.id);
                onDismiss?.(event.id);
              }}
              className="rounded border border-slate-400/40 px-1.5 py-0.5 text-[10px] font-semibold text-slate-100 hover:bg-slate-900/40"
              aria-label="アラートを閉じる"
              title="閉じる"
            >
              ✕
            </button>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-100">{event.message}</p>
        </article>
      ))}
    </div>
  );
}

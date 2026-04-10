"use client";

import clsx from "clsx";
import { createElement, useEffect, useState } from "react";

type DataFreshnessKind = "price" | "fundamentals";

interface DataFreshnessBadgeProps {
  kind: DataFreshnessKind;
  timestamp?: string | null;
  className?: string;
}

interface FreshnessDescriptor {
  label: string;
  tone: "neutral" | "positive" | "warning" | "danger";
  title: string;
}

function formatRelativeLabel(diffMinutes: number): string {
  if (diffMinutes < 60) {
    return `${Math.max(diffMinutes, 0)}分前`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}時間前`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}日前`;
}

function describeFreshness(kind: DataFreshnessKind, timestamp?: string | null, nowMs?: number | null): FreshnessDescriptor {
  const prefix = kind === "price" ? "価格" : "財務";
  if (!timestamp) {
    return {
      label: `${prefix} 未取得`,
      tone: "neutral",
      title: `${prefix}の更新時刻はまだ取得されていません。`
    };
  }

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return {
      label: `${prefix} 時刻不明`,
      tone: "neutral",
      title: `${prefix}の更新時刻を解釈できませんでした。`
    };
  }

  if (nowMs == null) {
    return {
      label: `${prefix} 更新済み`,
      tone: "neutral",
      title: `${prefix}の更新時刻を確認しています。`
    };
  }

  const title = `${prefix}更新: ${parsed.toLocaleString("ja-JP")}`;
  const diffMinutes = Math.max(0, Math.floor((nowMs - parsed.getTime()) / 60_000));
  const label = `${prefix} ${formatRelativeLabel(diffMinutes)}`;
  const diffDays = diffMinutes / (60 * 24);
  const tone =
    kind === "price"
      ? diffMinutes <= 30
        ? "positive"
        : diffMinutes <= 180
          ? "warning"
          : "danger"
      : diffDays <= 60
        ? "positive"
        : diffDays <= 120
          ? "warning"
          : "danger";

  return {
    label,
    tone,
    title
  };
}

const TONE_CLASSNAME: Record<FreshnessDescriptor["tone"], string> = {
  neutral: "border-border-subtle/70 bg-canvas-deep/50 text-text-muted",
  positive: "border-positive/30 bg-positive/10 text-positive",
  warning: "border-amber/30 bg-amber/10 text-amber",
  danger: "border-danger/30 bg-danger/10 text-danger"
};

export function DataFreshnessBadge({ kind, timestamp, className }: DataFreshnessBadgeProps): JSX.Element {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const descriptor = describeFreshness(kind, timestamp, nowMs);

  return createElement(
    "span",
    {
      className: clsx(
        "inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-medium leading-none",
        TONE_CLASSNAME[descriptor.tone],
        className
      ),
      title: descriptor.title,
      "aria-label": descriptor.title
    },
    descriptor.label
  );
}

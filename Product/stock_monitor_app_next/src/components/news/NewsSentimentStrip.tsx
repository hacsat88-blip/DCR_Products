"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";

import { classifySentiment, type Sentiment } from "@/lib/news/sentiment";

export interface NewsSentimentItem {
  id: string;
  publishedAt: string;
  title: string;
  summary?: string;
  url: string;
}

export interface NewsSentimentStripProps {
  items: NewsSentimentItem[];
  widthPerHour?: number;
  height?: number;
  className?: string;
}

const COLOR_BY_SENTIMENT: Record<Sentiment, string> = {
  positive: "var(--inp-positive, #22C55E)",
  negative: "var(--inp-negative, #F97066)",
  neutral: "var(--inp-text-secondary, #9AA9BF)",
};

interface StripItem extends NewsSentimentItem {
  sentiment: Sentiment;
  ts: number;
  offsetPx: number;
}

export function NewsSentimentStrip({
  items,
  widthPerHour = 6,
  height = 28,
  className,
}: NewsSentimentStripProps): JSX.Element {
  const [hovered, setHovered] = useState<string | null>(null);

  const { normalized, totalWidth } = useMemo(() => {
    if (items.length === 0) {
      return { normalized: [] as StripItem[], totalWidth: 0 };
    }
    const parsed = items
      .map((it) => ({
        ...it,
        ts: new Date(it.publishedAt).getTime(),
      }))
      .filter((it) => Number.isFinite(it.ts))
      .sort((a, b) => a.ts - b.ts);

    if (parsed.length === 0) {
      return { normalized: [] as StripItem[], totalWidth: 0 };
    }
    const start = parsed[0]!.ts;
    const end = parsed[parsed.length - 1]!.ts;
    const spanHours = Math.max(1, (end - start) / (60 * 60 * 1000));
    const width = Math.ceil(spanHours * widthPerHour) + 12;
    const strip: StripItem[] = parsed.map((it) => ({
      ...it,
      sentiment: classifySentiment(it.title, it.summary),
      offsetPx: ((it.ts - start) / (60 * 60 * 1000)) * widthPerHour,
    }));
    return { normalized: strip, totalWidth: width };
  }, [items, widthPerHour]);

  if (normalized.length === 0) {
    return (
      <div
        role="img"
        aria-label="ニュースセンチメント帯"
        className={clsx("inp-news-strip-empty text-xs", className)}
        style={{ color: "var(--inp-text-secondary, #9AA9BF)" }}
      >
        ニュースなし
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label="ニュースセンチメント帯"
      className={clsx("inp-news-strip relative", className)}
      style={{
        width: totalWidth,
        height,
        background: "var(--inp-bg-elevated, #1B2331)",
        border: "1px solid var(--inp-border, #263042)",
        borderRadius: 6,
      }}
    >
      {normalized.map((it) => {
        const left = it.offsetPx;
        const color = COLOR_BY_SENTIMENT[it.sentiment];
        const isHover = hovered === it.id;
        return (
          <button
            key={it.id}
            type="button"
            data-testid={`news-bar-${it.id}`}
            data-sentiment={it.sentiment}
            aria-label={`${it.title} (${it.sentiment})`}
            onMouseEnter={() => setHovered(it.id)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(it.id)}
            onBlur={() => setHovered(null)}
            className="absolute top-0 h-full"
            style={{
              left,
              width: 3,
              background: color,
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            {isHover ? (
              <span
                role="tooltip"
                data-testid={`news-tip-${it.id}`}
                className="inp-glass absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 text-[11px]"
                style={{
                  top: height + 4,
                  color: "var(--inp-text-primary, #E6EDF7)",
                  pointerEvents: "none",
                }}
              >
                {it.title}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

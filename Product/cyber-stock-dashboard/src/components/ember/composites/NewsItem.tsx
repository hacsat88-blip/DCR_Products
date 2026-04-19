import React from 'react';
import type { NewsRecord } from './types';

interface NewsItemProps {
  news: NewsRecord;
  compact?: boolean;
}

/** Returns a Japanese relative time string like "2時間前". */
function relativeTimeJp(publishedAt: string): string {
  const now = Date.now();
  const then = new Date(publishedAt).getTime();
  const diffMs = now - then;
  if (isNaN(diffMs)) return publishedAt;

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}週間前`;
  const months = Math.floor(days / 30);
  return `${months}ヶ月前`;
}

const SENTIMENT_COLOR: Record<string, string> = {
  positive: 'var(--sage)',
  negative: 'var(--down)',
  neutral: 'var(--ink-mute)',
};

export default function NewsItem({ news, compact = false }: NewsItemProps) {
  const sentimentColor = SENTIMENT_COLOR[news.sentiment ?? 'neutral'] ?? 'var(--ink-mute)';
  const timeStr = relativeTimeJp(news.publishedAt);

  return (
    <div
      className="relative rounded-lg border border-[color:var(--border)] bg-bg-2 overflow-hidden"
      style={{ padding: compact ? '12px 14px 12px 18px' : '14px 14px 14px 18px' }}
    >
      {/* Sentiment stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg"
        style={{ background: sentimentColor }}
        aria-hidden
      />

      {/* Top row: tag + time */}
      <div className="flex items-center gap-2 mb-2">
        {news.tag && (
          <span
            className="rounded-full text-ink-soft font-mono"
            style={{
              fontSize: 10,
              padding: '2px 8px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              fontWeight: 600,
            }}
          >
            {news.tag}
          </span>
        )}
        <span className="text-ink-mute font-mono ml-auto" style={{ fontSize: 10 }}>
          {timeStr}
        </span>
      </div>

      {/* Title */}
      <a
        href={news.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-ink hover:text-coral transition-colors"
        style={{
          fontSize: compact ? 14 : 16,
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textDecoration: 'none',
        }}
      >
        {news.title}
      </a>

      {/* Source */}
      <div className="text-ink-mute mt-1" style={{ fontSize: 11 }}>
        {news.source}
      </div>

      {/* Summary (non-compact only) */}
      {!compact && news.summary && (
        <p
          className="text-ink-soft mt-2"
          style={{
            fontSize: 12,
            lineHeight: 1.6,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {news.summary}
        </p>
      )}
    </div>
  );
}

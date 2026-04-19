'use client';

import React from 'react';
import { Card, SectorDot, UpDown } from '@/components/ember/ui';
import { Sparkline } from '@/components/ember/charts';
import type { StockSummary } from './types';

interface PickCardProps {
  stock: StockSummary;
  onSelect?: (id: string) => void;
  reason?: string;
}

export default function PickCard({ stock, onSelect, reason }: PickCardProps) {
  const sparkColor = stock.change >= 0 ? 'var(--coral)' : 'var(--down)';
  const score = stock.totalScore ?? 0;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(stock.id)}
      className="w-full text-left rounded-xl bg-surface border border-[color:var(--border)] p-[18px] cursor-pointer"
      style={{
        boxShadow: 'var(--shadow-md)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-lg)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = '';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-md)';
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <SectorDot sector={stock.sector} />
            <span className="text-ink-soft" style={{ fontSize: 11 }}>{stock.sector}</span>
          </div>
        </div>
        {stock.totalScore !== undefined && (
          <span
            className="font-serif text-coral"
            style={{ fontSize: 22, lineHeight: 1, fontWeight: 600 }}
            aria-label={`スコア ${score}`}
          >
            {score}
          </span>
        )}
      </div>

      {/* Title */}
      <div className="mb-3">
        <div className="font-serif text-ink" style={{ fontSize: 22, lineHeight: 1.15 }}>
          {stock.name}
          {stock.nameJp && (
            <span className="text-ink-soft ml-1" style={{ fontSize: 14 }}>{stock.nameJp}</span>
          )}
        </div>
        <div className="font-mono text-ink-mute mt-0.5" style={{ fontSize: 11 }}>{stock.ticker}</div>
      </div>

      {/* Sparkline */}
      {stock.spark && stock.spark.length > 0 && (
        <div className="mb-3">
          <Sparkline data={stock.spark} color={sparkColor} height={32} />
        </div>
      )}

      {/* Price + change */}
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-ink" style={{ fontSize: 18, fontWeight: 600 }}>
          {stock.currency === 'JPY' ? '¥' : '$'}
          {stock.price.toLocaleString()}
        </span>
        <UpDown value={stock.changePct} />
      </div>

      {/* Reason */}
      {reason && (
        <p
          className="text-ink-soft mt-2"
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {reason}
        </p>
      )}
    </button>
  );
}

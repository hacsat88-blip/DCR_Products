'use client';

import React, { useState } from 'react';
import { SectorDot, UpDown, FlipCard } from '@/components/ember/ui';
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
  const [flipped, setFlipped] = useState(false);

  const handleFlipToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFlipped((prev) => !prev);
  };

  const frontContent = (
    <div className="relative w-full h-full">
      {/* Flip toggle button - front side */}
      <button
        type="button"
        onClick={handleFlipToggle}
        aria-label="監査ビューを表示"
        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-soft border border-[color:var(--border)] flex items-center justify-center text-ink-soft hover:text-coral hover:border-coral transition-colors duration-200 z-10"
        style={{ fontSize: 16 }}
      >
        ⇄
      </button>

      <button
        type="button"
        onClick={() => onSelect?.(stock.id)}
        aria-label={`${stock.name} (${stock.ticker}) を選択、スコア ${score} 点`}
        className="w-full h-full text-left rounded-xl bg-surface border border-[color:var(--border)] p-[18px] cursor-pointer transition-all duration-200 hover:translate-y-[-2px] hover:shadow-[var(--shadow-lg)]"
        style={{ boxShadow: 'var(--shadow-md)' }}
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
    </div>
  );

  const backContent = (
    <div className="relative w-full h-full">
      {/* Flip toggle button - back side */}
      <button
        type="button"
        onClick={handleFlipToggle}
        aria-label="運用ビューに戻る"
        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-soft border border-[color:var(--border)] flex items-center justify-center text-ink-soft hover:text-coral hover:border-coral transition-colors duration-200 z-10"
        style={{ fontSize: 16 }}
      >
        ⇄
      </button>

      <div
        className="w-full h-full rounded-xl bg-surface border border-[color:var(--border)] p-[18px]"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        {/* Audit View Title */}
        <div className="mb-4">
          <h3 className="font-serif text-ink" style={{ fontSize: 18, fontWeight: 600 }}>
            監査ビュー / Auditor View
          </h3>
          <div className="font-mono text-ink-mute mt-0.5" style={{ fontSize: 10 }}>
            {stock.ticker}
          </div>
        </div>

        {/* Rationale */}
        <div className="mb-3">
          <div className="text-ink-soft" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em' }}>
            RATIONALE
          </div>
          <p className="text-ink-soft mt-1" style={{ fontSize: 13, lineHeight: 1.5 }}>
            {reason || 'スコアリングロジックに基づき選定されました。詳細な分析データを準備中です。'}
          </p>
        </div>

        {/* Score Breakdown */}
        <div className="mb-3">
          <div className="text-ink-soft" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em' }}>
            SCORE BREAKDOWN
          </div>
          <div className="mt-1 text-ink-soft" style={{ fontSize: 12 }}>
            総合スコア: <span className="font-mono text-coral font-semibold">{score}</span>
            <div className="text-ink-mute mt-1" style={{ fontSize: 11 }}>
              詳細分析データを準備中
            </div>
          </div>
        </div>

        {/* Sector detail */}
        <div className="mb-3">
          <div className="text-ink-soft" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em' }}>
            SECTOR
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <SectorDot sector={stock.sector} />
            <span className="text-ink" style={{ fontSize: 13 }}>{stock.sector}</span>
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-ink-mute mt-4" style={{ fontSize: 10 }}>
          最終更新: {new Date().toLocaleString('ja-JP')}
        </div>
      </div>
    </div>
  );

  return (
    <FlipCard
      front={frontContent}
      back={backContent}
      flipped={flipped}
      onFlipChange={setFlipped}
      ariaLabel={`${stock.name} (${stock.ticker}) カード`}
      backAriaLabel={`${stock.name} (${stock.ticker}) 監査ビュー`}
    />
  );
}

import React from 'react';
import { SectorDot, UpDown } from '@/components/ember/ui';
import { Sparkline } from '@/components/ember/charts';
import ScoreBar from './ScoreBar';
import type { StockSummary } from './types';

interface RankRowProps {
  rank: number;
  stock: StockSummary;
  onSelect?: (id: string) => void;
}

export default function RankRow({ rank, stock, onSelect }: RankRowProps) {
  const rankColor = rank <= 3 ? 'var(--coral)' : 'var(--ink-mute)';
  const score = stock.totalScore ?? 0;

  return (
    <div
      role="row"
      tabIndex={0}
      onClick={() => onSelect?.(stock.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect?.(stock.id); }}
      className="flex items-center gap-4 px-3 py-3 border-b border-[color:var(--border)] cursor-pointer transition-colors"
      style={{ outline: 'none' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-2)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
      onFocus={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-2)'; }}
      onBlur={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
    >
      {/* Rank number */}
      <span
        className="font-serif shrink-0"
        style={{ fontSize: 28, color: rankColor, lineHeight: 1, minWidth: 32, textAlign: 'center' }}
      >
        {rank}
      </span>

      {/* Sector dot */}
      <SectorDot sector={stock.sector} />

      {/* Name + ticker */}
      <div className="flex-1 min-w-0">
        <div className="text-ink font-serif truncate" style={{ fontSize: 14, fontWeight: 600 }}>
          {stock.name}
          {stock.nameJp && (
            <span className="text-ink-mute ml-1" style={{ fontSize: 11 }}>{stock.nameJp}</span>
          )}
        </div>
        <div className="font-mono text-ink-mute" style={{ fontSize: 10 }}>{stock.ticker}</div>
      </div>

      {/* Score bar */}
      <div style={{ width: 120 }}>
        <ScoreBar value={score} showValue />
      </div>

      {/* Change % */}
      <div className="shrink-0">
        <UpDown value={stock.changePct} size="sm" />
      </div>

      {/* Sparkline */}
      {stock.spark && stock.spark.length > 0 && (
        <div className="shrink-0">
          <Sparkline
            data={stock.spark}
            color={stock.change >= 0 ? 'var(--coral)' : 'var(--down)'}
            height={28}
            width={64}
          />
        </div>
      )}
    </div>
  );
}

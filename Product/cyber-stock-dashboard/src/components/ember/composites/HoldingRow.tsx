import React from 'react';
import { SectorDot, UpDown } from '@/components/ember/ui';
import { Sparkline } from '@/components/ember/charts';
import type { Holding } from './types';

interface HoldingRowProps {
  holding: Holding;
  onSelect?: (id: string) => void;
}

function formatPrice(value: number, currency: 'JPY' | 'USD'): string {
  return currency === 'JPY'
    ? `¥${value.toLocaleString()}`
    : `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function HoldingRow({ holding, onSelect }: HoldingRowProps) {
  const sparkColor = holding.change >= 0 ? 'var(--up)' : 'var(--down)';
  const weightPct = Math.min(1, Math.max(0, holding.weight));

  return (
    <div
      role="row"
      tabIndex={0}
      onClick={() => onSelect?.(holding.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect?.(holding.id); }}
      className="grid items-center gap-3 rounded-md border border-[color:var(--border)] bg-bg-2 px-3 py-2.5 cursor-pointer transition-colors"
      style={{
        gridTemplateColumns: 'auto 1fr auto auto auto auto auto auto',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--coral)';
        (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLDivElement).style.background = '';
      }}
      onFocus={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--coral)'; }}
      onBlur={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
    >
      {/* Sector dot */}
      <SectorDot sector={holding.sector} />

      {/* Name + ticker */}
      <div className="min-w-0">
        <div className="text-ink font-serif truncate" style={{ fontSize: 13, fontWeight: 600 }}>
          {holding.name}
        </div>
        <div className="font-mono text-ink-mute" style={{ fontSize: 10 }}>{holding.ticker}</div>
      </div>

      {/* Quantity */}
      <div className="font-mono text-ink-soft text-right" style={{ fontSize: 11 }}>
        {holding.quantity.toLocaleString()}株
      </div>

      {/* Cost */}
      <div className="font-mono text-ink-mute text-right" style={{ fontSize: 11 }}>
        {formatPrice(holding.cost / holding.quantity, holding.currency)}
      </div>

      {/* Current price */}
      <div className="font-mono text-ink text-right" style={{ fontSize: 12 }}>
        {formatPrice(holding.price, holding.currency)}
      </div>

      {/* Market value */}
      <div className="font-serif text-ink text-right" style={{ fontSize: 13, fontWeight: 600 }}>
        {formatPrice(holding.marketValue, holding.currency)}
      </div>

      {/* P&L */}
      <div className="text-right">
        <UpDown value={holding.plPct} size="sm" />
        <div
          className="font-mono"
          style={{ fontSize: 11, color: holding.pl >= 0 ? 'var(--up)' : 'var(--down)' }}
        >
          {holding.pl >= 0 ? '+' : ''}
          {formatPrice(holding.pl, holding.currency)}
        </div>
      </div>

      {/* Weight bar */}
      <div className="flex items-center gap-1">
        <div
          className="rounded-full bg-bg-2 overflow-hidden"
          style={{ width: 60, height: 5 }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${weightPct * 100}%`, background: 'var(--coral)' }}
          />
        </div>
        <span className="font-mono text-ink-mute" style={{ fontSize: 9 }}>
          {(weightPct * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

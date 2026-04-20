import React from 'react';
import { SectorDot, UpDown } from '@/components/ember/ui';
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
  const weightPct = Math.min(1, Math.max(0, holding.weight));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onSelect(holding.id);
    }
  };

  const role = onSelect ? 'button' : 'group';
  const ariaLabel = onSelect ? `${holding.name} (${holding.ticker}) を編集` : `${holding.name} (${holding.ticker})`;

  return (
    <div
      role={role}
      tabIndex={onSelect ? 0 : undefined}
      onClick={() => onSelect?.(holding.id)}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      className="grid items-center gap-x-3 gap-y-2 rounded-md border border-[color:var(--border)] bg-bg-2 px-3 py-2.5 cursor-pointer transition-colors grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto]"
      style={{ outline: 'none' }}
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

      {/* Current price (3rd on mobile, 5th on desktop) */}
      <div className="font-mono text-ink text-right md:order-none" style={{ fontSize: 12 }}>
        {formatPrice(holding.price, holding.currency)}
      </div>

      {/* Quantity (new row on mobile) */}
      <div className="font-mono text-ink-soft text-right col-start-2 md:col-start-auto md:order-none" style={{ fontSize: 11 }}>
        <span className="md:hidden text-ink-mute" style={{ fontSize: 9 }}>数量 </span>
        {holding.quantity.toLocaleString()}株
      </div>

      {/* Cost */}
      <div className="font-mono text-ink-mute text-right md:order-none" style={{ fontSize: 11 }}>
        <span className="md:hidden text-ink-mute" style={{ fontSize: 9 }}>@</span>
        {formatPrice(holding.cost / holding.quantity, holding.currency)}
      </div>

      {/* Market value (hidden on mobile) */}
      <div className="hidden md:block font-serif text-ink text-right" style={{ fontSize: 13, fontWeight: 600 }}>
        {formatPrice(holding.marketValue, holding.currency)}
      </div>

      {/* P&L */}
      <div className="text-right md:order-none">
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
      <div className="flex items-center gap-1 md:order-none">
        <span className="md:hidden text-ink-mute" style={{ fontSize: 9 }}>構成比 </span>
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

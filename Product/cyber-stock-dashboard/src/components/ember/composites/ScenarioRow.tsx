import React from 'react';
import type { ScenarioRowData } from './types';

interface ScenarioRowProps {
  row: ScenarioRowData;
}

export default function ScenarioRow({ row }: ScenarioRowProps) {
  return (
    <div className="flex items-stretch gap-2 py-2">
      {/* Horizon label */}
      <div
        className="font-serif text-ink-mute uppercase flex items-center"
        style={{ fontSize: 14, minWidth: 80, letterSpacing: '0.06em' }}
      >
        {row.horizon}
      </div>

      {/* Bull */}
      <div
        className="flex-1 rounded-md px-3 py-2 text-center font-serif"
        style={{ backgroundColor: 'rgba(var(--sage-rgb, 122, 163, 127), 0.10)', fontSize: 13 }}
      >
        <div className="text-ink-mute" style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>
          BULL
        </div>
        <div className="text-ink">{row.bull}</div>
      </div>

      {/* Base */}
      <div
        className="flex-1 rounded-md px-3 py-2 text-center font-serif"
        style={{ backgroundColor: 'rgba(var(--clay-rgb, 196, 140, 97), 0.10)', fontSize: 13 }}
      >
        <div className="text-ink-mute" style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>
          BASE
        </div>
        <div className="text-ink">{row.base}</div>
      </div>

      {/* Bear */}
      <div
        className="flex-1 rounded-md px-3 py-2 text-center font-serif"
        style={{ backgroundColor: 'rgba(var(--coral-deep-rgb, 180, 90, 60), 0.10)', fontSize: 13 }}
      >
        <div className="text-ink-mute" style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>
          BEAR
        </div>
        <div className="text-ink">{row.bear}</div>
      </div>
    </div>
  );
}

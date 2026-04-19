import React from 'react';

interface ScoreBarProps {
  value: number;
  label?: string;
  color?: string;
  height?: number;
  showValue?: boolean;
}

export default function ScoreBar({
  value,
  label,
  color = 'var(--coral)',
  height = 8,
  showValue = false,
}: ScoreBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className="flex items-center gap-1.5">
      {label && (
        <span className="text-ink-mute font-mono" style={{ fontSize: 10, minWidth: 56 }}>
          {label}
        </span>
      )}
      <div
        className="flex-1 rounded-full bg-bg-2 overflow-hidden"
        style={{ height }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${clamped}%`, background: color, transition: 'width 0.35s ease' }}
        />
      </div>
      {showValue && (
        <span className="font-mono text-ink-mute" style={{ fontSize: 10, minWidth: 24, textAlign: 'right' }}>
          {Math.round(clamped)}
        </span>
      )}
    </div>
  );
}

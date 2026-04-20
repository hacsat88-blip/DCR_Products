'use client';

import React, { useState } from 'react';

export interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  flipped?: boolean; // controlled
  defaultFlipped?: boolean; // uncontrolled
  onFlipChange?: (next: boolean) => void;
  ariaLabel?: string;
  backAriaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function FlipCard({
  front,
  back,
  flipped: controlledFlipped,
  defaultFlipped = false,
  ariaLabel,
  backAriaLabel,
  className = '',
  style,
}: FlipCardProps) {
  const [internalFlipped] = useState(defaultFlipped);

  const isControlled = controlledFlipped !== undefined;
  const actualFlipped = isControlled ? controlledFlipped : internalFlipped;

  return (
    <div
      className={`flip-card ${className}`}
      style={style}
      aria-label={actualFlipped ? backAriaLabel : ariaLabel}
    >
      <div className={`flip-card-inner ${actualFlipped ? 'is-flipped' : ''}`}>
        <div
          className="flip-face flip-face-front"
          aria-hidden={actualFlipped}
          {...(actualFlipped ? { inert: true } : {})}
        >
          {front}
        </div>
        <div
          className="flip-face flip-face-back"
          aria-hidden={!actualFlipped}
          {...(!actualFlipped ? { inert: true } : {})}
        >
          {back}
        </div>
      </div>
    </div>
  );
}

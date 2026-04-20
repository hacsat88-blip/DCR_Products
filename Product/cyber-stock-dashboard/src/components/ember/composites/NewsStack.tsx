'use client';

/* eslint-disable react-hooks/refs */

import React, { useState, useRef, useCallback } from 'react';
import NewsItem from './NewsItem';
import type { NewsRecord } from './types';

interface NewsStackProps {
  items: NewsRecord[];
  threshold?: number;
}

const DRAG_THRESHOLD = 60;
const ANIM_DURATION = 350;
const EASING = 'cubic-bezier(.2,.8,.2,1)';

export default function NewsStack({ items, threshold = 5 }: NewsStackProps) {
  const [frontIndex, setFrontIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const reducedMotion = useRef(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );

  const total = items.length;

  // Virtual rotation helpers
  const getItem = useCallback(
    (offset: number) => items[(frontIndex + offset) % total],
    [frontIndex, items, total],
  );

  const advance = useCallback(
    (dir: 1 | -1) => {
      if (animating) return;
      setAnimating(true);
      setTimeout(() => {
        setFrontIndex((i) => (i + dir + total) % total);
        setAnimating(false);
      }, ANIM_DURATION);
    },
    [animating, total],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (animating) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        advance(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        advance(-1);
      }
    },
    [advance, animating],
  );

  // Pointer drag handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStart.current) return;
      setDragDelta({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    },
    [],
  );

  const onPointerUp = useCallback(() => {
    if (!dragStart.current) return;
    const dist = Math.sqrt(dragDelta.x ** 2 + dragDelta.y ** 2);
    dragStart.current = null;
    setDragging(false);
    setDragDelta({ x: 0, y: 0 });
    if (dist > DRAG_THRESHOLD) advance(1);
  }, [dragDelta, advance]);

  // List layout for small sets
  if (total <= threshold) {
    return (
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <NewsItem key={item.id} news={item} />
        ))}
      </div>
    );
  }

  // Deck layout
  const VISIBLE = Math.min(3, total);

  const cardStyle = (depth: number): React.CSSProperties => {
    if (depth === 0) {
      // Front card
      const tx = dragging ? dragDelta.x : 0;
      const ty = dragging ? dragDelta.y : 0;
      const rotate = dragging ? dragDelta.x * 0.05 : 0;
      return reducedMotion.current
        ? { opacity: animating ? 0 : 1, transition: `opacity ${ANIM_DURATION}ms` }
        : {
            transform: `translate(${tx}px, ${ty}px) rotate(${rotate}deg)`,
            transition: dragging ? 'none' : `transform ${ANIM_DURATION}ms ${EASING}`,
            zIndex: 10,
            cursor: dragging ? 'grabbing' : 'grab',
          };
    }
    const scale = 1 - depth * 0.04;
    const offsetY = depth * 8;
    const rotate = depth % 2 === 0 ? depth * 1.5 : -depth * 1.5;
    const opacity = 1 - depth * 0.18;
    return reducedMotion.current
      ? { opacity }
      : {
          transform: `translateY(${offsetY}px) scale(${scale}) rotate(${rotate}deg)`,
          opacity,
          zIndex: 10 - depth,
          transition: `transform ${ANIM_DURATION}ms ${EASING}, opacity ${ANIM_DURATION}ms ${EASING}`,
        };
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Deck */}
      <div className="relative" style={{ height: 160, userSelect: 'none' }}>
        {Array.from({ length: VISIBLE })
          .map((_, i) => VISIBLE - 1 - i)
          .map((depth) => {
            const item = getItem(depth);
            return (
              <div
                key={item.id}
                className="absolute inset-x-0 top-0 focus-visible:outline-2 focus-visible:outline-coral focus-visible:outline-offset-2"
                style={{ ...cardStyle(depth), outline: 'none' }}
                {...(depth === 0
                  ? {
                      onPointerDown,
                      onPointerMove,
                      onPointerUp,
                      onPointerCancel: onPointerUp,
                      tabIndex: 0,
                      role: 'button',
                      'aria-label': 'ニュース詳細・次のニュースへ進む',
                      onKeyDown: handleKeyDown,
                    }
                  : {})}
              >
                <NewsItem news={item} />
              </div>
            );
          })}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => advance(-1)}
            disabled={animating}
            className="rounded-full text-white font-mono"
            style={{
              background: 'var(--coral)',
              padding: '5px 14px',
              fontSize: 12,
              border: 'none',
              cursor: animating ? 'default' : 'pointer',
              opacity: animating ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            ← 前へ
          </button>
          <button
            type="button"
            onClick={() => advance(1)}
            disabled={animating}
            className="rounded-full text-white font-mono"
            style={{
              background: 'var(--coral)',
              padding: '5px 14px',
              fontSize: 12,
              border: 'none',
              cursor: animating ? 'default' : 'pointer',
              opacity: animating ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            次へ →
          </button>
        </div>

        {/* Indicator pill */}
        <span
          className="font-mono text-ink-mute rounded-full bg-bg-2"
          style={{ fontSize: 11, padding: '3px 10px' }}
        >
          {frontIndex + 1} / {total}
        </span>
      </div>
    </div>
  );
}

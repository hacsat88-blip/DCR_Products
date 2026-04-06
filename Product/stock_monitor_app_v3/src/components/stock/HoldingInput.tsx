"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";

import { useStockStore } from "@/store/useStockStore";

interface HoldingInputProps {
  stockId: string;
  price?: number;
  compact?: boolean;
}

export function HoldingInput({ stockId, price, compact = false }: HoldingInputProps): JSX.Element {
  const holdingsMap = useStockStore((s) => s.holdingsMap);
  const setHolding = useStockStore((s) => s.setHolding);
  const adjustHolding = useStockStore((s) => s.adjustHolding);

  const shares = holdingsMap[stockId] ?? 0;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);
  const savedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current);
    };
  }, []);

  const showSaved = useCallback(() => {
    setSaved(true);
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current);
    savedTimerRef.current = window.setTimeout(() => {
      setSaved(false);
      savedTimerRef.current = null;
    }, 1000);
  }, []);

  const handleAdjust = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      let delta = 100;
      if (e.shiftKey) delta = 1;
      else if (e.ctrlKey || e.metaKey) delta = 1000;

      const direction = e.currentTarget.dataset.dir === "dec" ? -1 : 1;
      adjustHolding(stockId, delta * direction);
      showSaved();
    },
    [stockId, adjustHolding, showSaved]
  );

  const startEdit = useCallback(() => {
    setDraft(shares > 0 ? String(shares) : "");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }, [shares]);

  const commitEdit = useCallback(() => {
    setEditing(false);
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const parsed = parseInt(draft, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      setHolding(stockId, parsed);
      showSaved();
    }
  }, [draft, stockId, setHolding, showSaved]);

  const handleDraftChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/[^0-9]/g, "");
      setDraft(val);
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = null;
        const parsed = parseInt(val, 10);
        if (!Number.isNaN(parsed) && parsed >= 0) {
          setHolding(stockId, parsed);
          showSaved();
        }
      }, 300);
    },
    [stockId, setHolding, showSaved]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") commitEdit();
      if (e.key === "Escape") setEditing(false);
    },
    [commitEdit]
  );

  const btnClass = compact
    ? "flex h-[28px] w-[28px] items-center justify-center rounded-lg bg-white/5 text-xs text-text-secondary hover:bg-white/10 transition-colors"
    : "flex h-[36px] w-[36px] items-center justify-center rounded-lg bg-white/5 text-sm text-text-secondary hover:bg-white/10 transition-colors";

  const evalValue = price && shares > 0 ? shares * price : null;

  if (compact) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button type="button" data-dir="dec" onClick={handleAdjust} className={btnClass} aria-label="保有株数を減らす">
          −
        </button>
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={draft}
            onChange={handleDraftChange}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="h-[28px] w-[56px] rounded-lg border border-border-subtle bg-canvas/90 text-center font-mono text-xs text-text-primary outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className={clsx(
              "h-[28px] min-w-[56px] rounded-lg border px-1 text-center font-mono text-xs transition-colors",
              shares > 0
                ? "border-positive/30 bg-positive/5 text-positive"
                : "border-border-subtle/40 bg-canvas-deep/40 text-text-muted"
            )}
          >
            {shares > 0 ? shares.toLocaleString("ja-JP") : "未保有"}
          </button>
        )}
        <button type="button" data-dir="inc" onClick={handleAdjust} className={btnClass} aria-label="保有株数を増やす">
          +
        </button>
        {saved && (
          <span className="ml-1 text-[10px] text-secondary animate-fade-up" role="status" aria-live="polite">保存済み</span>
        )}
      </div>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted">保有株数:</span>
        <button type="button" data-dir="dec" onClick={handleAdjust} className={btnClass} aria-label="保有株数を減らす">
          −
        </button>
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={draft}
            onChange={handleDraftChange}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="h-[36px] w-[80px] rounded-lg border border-border-subtle bg-canvas/90 text-center font-mono text-sm text-text-primary outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className={clsx(
              "h-[36px] min-w-[80px] rounded-lg border px-2 text-center font-mono text-sm transition-colors",
              shares > 0
                ? "border-positive/30 bg-positive/5 text-positive"
                : "border-border-subtle/40 bg-canvas-deep/40 text-text-muted"
            )}
          >
            {shares > 0 ? shares.toLocaleString("ja-JP") : "0"}
          </button>
        )}
        <button type="button" data-dir="inc" onClick={handleAdjust} className={btnClass} aria-label="保有株数を増やす">
          +
        </button>
        {saved && (
          <span className="ml-1 text-xs text-secondary animate-fade-up" role="status" aria-live="polite">保存済み</span>
        )}
      </div>
      {evalValue !== null && (
        <p className="mt-1 text-xs text-text-muted">
          評価額: <span className="text-slate-200">¥{evalValue.toLocaleString("ja-JP")}</span>
        </p>
      )}
    </div>
  );
}

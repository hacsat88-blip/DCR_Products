"use client";

import { useEffect, useState, type ChangeEvent, type KeyboardEvent } from "react";

import { compareAlpha, parseJpCode } from "@/lib/tickerRange";

export type JpRangeValue = { from: number; to: number };
export type UsExchange = "ANY" | "NYSE" | "NASDAQ" | "AMEX";
export type UsRangeValue = { from: string; to: string; exchange: UsExchange };

export interface RangePickerValue {
  jp?: JpRangeValue;
  us?: UsRangeValue;
}

export interface RangePickerProps {
  market: "JP" | "US";
  value: RangePickerValue;
  onChange: (next: RangePickerValue) => void;
  onSubmit?: () => void;
  className?: string;
}

const JP_DIGIT_RE = /^\d{1,5}$/;
const US_ALPHA_RE = /^[A-Z]{1,5}$/;
const US_EXCHANGES: readonly UsExchange[] = ["ANY", "NYSE", "NASDAQ", "AMEX"] as const;

export function RangePicker({
  market,
  value,
  onChange,
  onSubmit,
  className,
}: RangePickerProps): JSX.Element {
  // JP drafts
  const [jpFromText, setJpFromText] = useState<string>(
    value.jp ? String(value.jp.from) : "",
  );
  const [jpToText, setJpToText] = useState<string>(
    value.jp ? String(value.jp.to) : "",
  );
  const [jpError, setJpError] = useState<string | null>(null);

  // US drafts
  const [usFromText, setUsFromText] = useState<string>(value.us?.from ?? "");
  const [usToText, setUsToText] = useState<string>(value.us?.to ?? "");
  const [exchange, setExchange] = useState<UsExchange>(value.us?.exchange ?? "ANY");
  const [usError, setUsError] = useState<string | null>(null);

  // Sync from controlled value when it changes externally
  const jpValueFrom = value.jp?.from;
  const jpValueTo = value.jp?.to;
  useEffect(() => {
    if (jpValueFrom !== undefined) setJpFromText(String(jpValueFrom));
    if (jpValueTo !== undefined) setJpToText(String(jpValueTo));
  }, [jpValueFrom, jpValueTo]);

  const usValueFrom = value.us?.from;
  const usValueTo = value.us?.to;
  const usValueExchange = value.us?.exchange;
  useEffect(() => {
    if (usValueFrom !== undefined) setUsFromText(usValueFrom);
    if (usValueTo !== undefined) setUsToText(usValueTo);
    if (usValueExchange !== undefined) setExchange(usValueExchange);
  }, [usValueFrom, usValueTo, usValueExchange]);

  const emitJp = (fromRaw: string, toRaw: string): void => {
    const from = fromRaw.trim();
    const to = toRaw.trim();

    if (!from && !to) {
      setJpError(null);
      if (value.jp !== undefined) onChange({ ...value, jp: undefined });
      return;
    }

    const invalidFrom = from !== "" && !JP_DIGIT_RE.test(from);
    const invalidTo = to !== "" && !JP_DIGIT_RE.test(to);
    if (invalidFrom || invalidTo) {
      setJpError("数字のみ入力してください (0〜99999)");
      return;
    }
    if (!from || !to) {
      setJpError(null);
      return;
    }

    const fromN = parseJpCode(from);
    const toN = parseJpCode(to);
    if (fromN === null || toN === null) {
      setJpError("数字のみ入力してください (0〜99999)");
      return;
    }

    setJpError(null);
    const [lo, hi] = fromN <= toN ? [fromN, toN] : [toN, fromN];
    onChange({ ...value, jp: { from: lo, to: hi } });
  };

  const emitUs = (fromRaw: string, toRaw: string, ex: UsExchange): void => {
    const from = fromRaw.toUpperCase();
    const to = toRaw.toUpperCase();

    if (!from && !to) {
      setUsError(null);
      if (value.us !== undefined) onChange({ ...value, us: undefined });
      return;
    }

    const invalidFrom = from !== "" && !US_ALPHA_RE.test(from);
    const invalidTo = to !== "" && !US_ALPHA_RE.test(to);
    if (invalidFrom || invalidTo) {
      setUsError("A〜Zの英字1〜5文字で入力してください");
      return;
    }
    if (!from || !to) {
      setUsError(null);
      return;
    }
    if (from.length < 2 || to.length < 2) {
      setUsError("2文字以上で入力してください");
      return;
    }

    setUsError(null);
    const [lo, hi] = compareAlpha(from, to) <= 0 ? [from, to] : [to, from];
    onChange({ ...value, us: { from: lo, to: hi, exchange: ex } });
  };

  const handleJpFromChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const next = e.target.value;
    setJpFromText(next);
    emitJp(next, jpToText);
  };
  const handleJpToChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const next = e.target.value;
    setJpToText(next);
    emitJp(jpFromText, next);
  };

  const handleUsFromChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const next = e.target.value.toUpperCase();
    setUsFromText(next);
    emitUs(next, usToText, exchange);
  };
  const handleUsToChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const next = e.target.value.toUpperCase();
    setUsToText(next);
    emitUs(usFromText, next, exchange);
  };
  const handleExchangeChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const next = e.target.value as UsExchange;
    setExchange(next);
    emitUs(usFromText, usToText, next);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>): void => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit?.();
    }
  };

  const handleClear = (): void => {
    if (market === "JP") {
      setJpFromText("");
      setJpToText("");
      setJpError(null);
      if (value.jp !== undefined) onChange({ ...value, jp: undefined });
    } else {
      setUsFromText("");
      setUsToText("");
      setExchange("ANY");
      setUsError(null);
      if (value.us !== undefined) onChange({ ...value, us: undefined });
    }
  };

  const wrapperClass = [
    "inp-glass rounded-[var(--inp-radius-card)] p-4 md:p-5 flex flex-col gap-3",
    className ?? "",
  ]
    .join(" ")
    .trim();

  const inputClass =
    "inp-glass w-full rounded-[var(--inp-radius-control)] px-3 py-2 text-sm text-[var(--inp-text-primary)] placeholder:text-[var(--inp-text-muted)] outline-none transition focus-visible:inp-neon-ring";

  return (
    <div
      className={wrapperClass}
      onKeyDown={handleKeyDown}
      role="group"
      aria-label={market === "JP" ? "日本株コード範囲" : "米国ティッカー範囲"}
    >
      {market === "JP" ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex flex-1 min-w-[8rem] flex-col gap-1 text-xs text-[var(--inp-text-secondary)]">
              <span>開始コード</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d*"
                aria-label="JPコード開始"
                className={inputClass}
                maxLength={5}
                value={jpFromText}
                placeholder="例: 1300"
                onChange={handleJpFromChange}
              />
            </label>
            <span aria-hidden="true" className="pt-5 text-[var(--inp-text-secondary)]">
              〜
            </span>
            <label className="flex flex-1 min-w-[8rem] flex-col gap-1 text-xs text-[var(--inp-text-secondary)]">
              <span>終了コード</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d*"
                aria-label="JPコード終了"
                className={inputClass}
                maxLength={5}
                value={jpToText}
                placeholder="例: 1400"
                onChange={handleJpToChange}
              />
            </label>
            <button
              type="button"
              onClick={handleClear}
              aria-label="範囲をクリア"
              className="self-end rounded-[var(--inp-radius-control)] border border-[var(--inp-border)] px-3 py-2 text-xs text-[var(--inp-text-secondary)] hover:border-[var(--inp-accent)] hover:text-[var(--inp-accent)]"
            >
              クリア
            </button>
          </div>
          {jpError ? (
            <p role="alert" className="text-xs text-[var(--inp-negative)]">
              {jpError}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex flex-1 min-w-[7rem] flex-col gap-1 text-xs text-[var(--inp-text-secondary)]">
              <span>開始ティッカー</span>
              <input
                type="text"
                aria-label="USティッカー開始"
                className={inputClass}
                maxLength={5}
                value={usFromText}
                placeholder="例: AAP"
                onChange={handleUsFromChange}
              />
            </label>
            <span aria-hidden="true" className="pt-5 text-[var(--inp-text-secondary)]">
              〜
            </span>
            <label className="flex flex-1 min-w-[7rem] flex-col gap-1 text-xs text-[var(--inp-text-secondary)]">
              <span>終了ティッカー</span>
              <input
                type="text"
                aria-label="USティッカー終了"
                className={inputClass}
                maxLength={5}
                value={usToText}
                placeholder="例: AAPL"
                onChange={handleUsToChange}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--inp-text-secondary)]">
              <span>取引所</span>
              <select
                aria-label="取引所"
                className={inputClass}
                value={exchange}
                onChange={handleExchangeChange}
              >
                {US_EXCHANGES.map((ex) => (
                  <option key={ex} value={ex}>
                    {ex}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleClear}
              aria-label="範囲をクリア"
              className="self-end rounded-[var(--inp-radius-control)] border border-[var(--inp-border)] px-3 py-2 text-xs text-[var(--inp-text-secondary)] hover:border-[var(--inp-accent)] hover:text-[var(--inp-accent)]"
            >
              クリア
            </button>
          </div>
          {usError ? (
            <p role="alert" className="text-xs text-[var(--inp-negative)]">
              {usError}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default RangePicker;

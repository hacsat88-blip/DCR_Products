"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import {
  actionTone,
  formatActionLabel,
  formatMarketCap,
  formatNullableNumber,
  formatPercent,
  formatYen
} from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { ScoreBreakdownPanel } from "@/components/stock/ScoreBreakdownPanel";
import { StockRadarChart } from "@/components/stock/StockRadarChart";
import { HoldingInput } from "@/components/stock/HoldingInput";
import { useStockStore } from "@/store/useStockStore";
import { EvaluatedStock, HypothesisLog } from "@/types/stock";

interface StockDetailDrawerProps {
  stock: EvaluatedStock | null;
  hypothesis: HypothesisLog | null;
  open: boolean;
  hiddenByFilter: boolean;
  onClose: () => void;
  onToggleWatch: (stockId: string) => void;
  onSaveMemo: (stockId: string, memo: string) => void;
  onSaveHypothesis: (stockId: string, patch: Partial<HypothesisLog>) => void;
}

export function StockDetailDrawer({
  stock,
  hypothesis,
  open,
  hiddenByFilter,
  onClose,
  onToggleWatch,
  onSaveMemo,
  onSaveHypothesis
}: StockDetailDrawerProps): JSX.Element {
  const [memoDraft, setMemoDraft] = useState("");
  const [savedLabel, setSavedLabel] = useState("");
  const [hypothesisDraft, setHypothesisDraft] = useState("");
  const [rationaleDraft, setRationaleDraft] = useState("");
  const [reviewDateDraft, setReviewDateDraft] = useState("");
  const [outcomeDraft, setOutcomeDraft] = useState("");
  const [hypothesisSavedLabel, setHypothesisSavedLabel] = useState("");
  const memoTimerRef = useRef<number | null>(null);
  const hypothesisTimerRef = useRef<number | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (memoTimerRef.current !== null) {
      window.clearTimeout(memoTimerRef.current);
      memoTimerRef.current = null;
    }
    if (hypothesisTimerRef.current !== null) {
      window.clearTimeout(hypothesisTimerRef.current);
      hypothesisTimerRef.current = null;
    }
    setMemoDraft(stock?.memo ?? "");
    setSavedLabel("");
    setHypothesisDraft(hypothesis?.hypothesis ?? "");
    setRationaleDraft(hypothesis?.rationale ?? "");
    setReviewDateDraft(hypothesis?.reviewDate ?? "");
    setOutcomeDraft(hypothesis?.outcome ?? "");
    setHypothesisSavedLabel("");
    return () => {
      if (memoTimerRef.current !== null) {
        window.clearTimeout(memoTimerRef.current);
        memoTimerRef.current = null;
      }
      if (hypothesisTimerRef.current !== null) {
        window.clearTimeout(hypothesisTimerRef.current);
        hypothesisTimerRef.current = null;
      }
    };
  }, [stock?.id, stock?.memo, hypothesis?.hypothesis, hypothesis?.outcome, hypothesis?.rationale, hypothesis?.reviewDate]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  const tone = useMemo(() => (stock ? actionTone(stock.evaluatedAction) : "wait"), [stock]);

  if (!stock) {
    return <></>;
  }

  const handleSave = (): void => {
    onSaveMemo(stock.id, memoDraft);
    setSavedLabel("保存しました");
    if (memoTimerRef.current !== null) {
      window.clearTimeout(memoTimerRef.current);
    }
    memoTimerRef.current = window.setTimeout(() => {
      setSavedLabel("");
      memoTimerRef.current = null;
    }, 1200);
  };

  const handleSaveHypothesis = (): void => {
    onSaveHypothesis(stock.id, {
      hypothesis: hypothesisDraft,
      rationale: rationaleDraft,
      reviewDate: reviewDateDraft,
      outcome: outcomeDraft
    });
    setHypothesisSavedLabel("保存しました");
    if (hypothesisTimerRef.current !== null) {
      window.clearTimeout(hypothesisTimerRef.current);
    }
    hypothesisTimerRef.current = window.setTimeout(() => {
      setHypothesisSavedLabel("");
      hypothesisTimerRef.current = null;
    }, 1200);
  };

  return (
    <>
      <div
        className={clsx(
          "fixed inset-0 z-30 bg-canvas-deep/70 backdrop-blur-sm transition-opacity",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`stock-detail-title-${stock.id}`}
        className={clsx(
          "fixed inset-0 z-40 w-full overflow-y-auto border border-border-subtle bg-canvas p-5 shadow-2xl transition-transform duration-300 ease-smooth md:inset-y-0 md:right-0 md:left-auto md:w-[460px] md:border-y-0 md:border-r-0 md:border-l",
          open
            ? "translate-y-0 md:translate-y-0 md:translate-x-0"
            : "translate-y-full md:translate-y-0 md:translate-x-full"
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono tabular-nums text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">{stock.code}</p>
            <h3 id={`stock-detail-title-${stock.id}`} className="text-2xl font-bold tracking-heading text-text-primary">{stock.name}</h3>
            <p className="mt-1 text-sm text-text-secondary">{stock.sector}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-lg border border-primary/30 px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-primary/50 hover:text-text-primary"
          >
            閉じる
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge tone={tone === "buy" ? "buy" : tone === "exclude" ? "exclude" : "wait"} size="md" glow>
            {formatActionLabel(stock.evaluatedAction)}
          </Badge>
          <ScoreRing score={stock.score} size={36} strokeWidth={2.5} className="ml-1" />
          <span className="rounded-lg border border-border-subtle px-3 py-1 text-xs text-text-secondary">{formatMarketCap(stock.marketCap)}</span>
        </div>

        <div className="sticky top-0 z-10 mb-4 card-surface p-4 backdrop-blur border-secondary/20">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-text-primary">判断クイックレビュー</h4>
          <p className="mt-2 text-sm text-text-secondary">
            今の判定: <strong className="text-text-primary">{formatActionLabel(stock.evaluatedAction)}</strong> / 本命度 <strong className="text-text-primary">{stock.score}</strong>
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            次に見る数字: <strong className="text-text-primary">{stock.coreKpiLabel}</strong> ({stock.coreKpiValue})
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            崩れる条件: {stock.collapseCondition}
          </p>
        </div>

        {hiddenByFilter ? (
          <div className="mb-4 rounded-lg border border-amber/25 bg-amber/5 px-3 py-2 text-sm text-amber">
            現在の絞り込み条件では一覧に表示されていません
          </div>
        ) : null}

        <CollapsibleSection title="会社概要" defaultOpen>
          <div className="card-surface p-4">
            <p className="text-sm leading-7 text-text-primary">{stock.oneLiner}</p>
            <hr className="my-3 border-border-subtle" />
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">散文サマリー</p>
            <p className="mt-1 text-sm leading-7 text-text-primary">{stock.summary}</p>
            <p className="mt-3 text-xs text-text-muted">判定根拠: {stock.actionReason}</p>
          </div>
        </CollapsibleSection>

        <div className="mt-4">
          <ScoreBreakdownPanel stock={stock} />
        </div>

        <CollapsibleSection title="多角評価レーダー" defaultOpen>
          <div className="flex justify-center py-2">
            <StockRadarChart stock={stock} />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="価格とベンチマーク" defaultOpen>
          <div className="h-[320px]">
            <ResponsiveContainer>
              <LineChart data={stock.chartData} margin={{ top: 8, right: 10, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#9fb4d7" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9fb4d7" tick={{ fontSize: 11 }} width={36} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(20, 24, 33, 0.95)",
                    border: "1px solid rgba(76,110,245,0.25)",
                    borderRadius: "8px",
                    backdropFilter: "blur(8px)"
                  }}
                />
                <Line type="monotone" dataKey="price" name="銘柄" stroke="#22C55E" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="benchmark" name="ベンチマーク" stroke="#06B6D4" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="保有情報" defaultOpen>
          <HoldingSection stockId={stock.id} price={stock.price} />
        </CollapsibleSection>

        <CollapsibleSection title="主要指標">
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-text-muted text-xs">株価</dt>
              <dd className="font-mono tabular-nums text-text-primary font-medium">{formatYen(stock.price)}</dd>
            </div>
            <div>
              <dt className="text-text-muted text-xs">前日比</dt>
              <dd className="font-mono tabular-nums text-text-primary font-medium">{formatPercent(stock.changePercent)}</dd>
            </div>
            <div>
              <dt className="text-text-muted text-xs">売上成長</dt>
              <dd className="font-mono tabular-nums text-text-primary font-medium">{formatPercent(stock.revenueGrowth)}</dd>
            </div>
            <div>
              <dt className="text-text-muted text-xs">営業利益成長</dt>
              <dd className="font-mono tabular-nums text-text-primary font-medium">{formatPercent(stock.opGrowth)}</dd>
            </div>
            <div>
              <dt className="text-text-muted text-xs">営業CF</dt>
              <dd className="font-mono tabular-nums text-text-primary font-medium">{stock.operatingCF === null ? "-" : `${stock.operatingCF.toLocaleString("ja-JP")}`}</dd>
            </div>
            <div>
              <dt className="text-text-muted text-xs">PER / PBR</dt>
              <dd className="font-mono tabular-nums text-text-primary font-medium">
                {formatNullableNumber(stock.per)} / {formatNullableNumber(stock.pbr)}
              </dd>
            </div>
          </dl>
        </CollapsibleSection>

        <CollapsibleSection title="注目点・リスク">
          <p className="text-sm text-text-secondary">
            <span className="text-xs text-text-muted">次回決算で見る数字: </span>
            {stock.coreKpiLabel}: <strong className="text-text-primary">{stock.coreKpiValue}</strong>
          </p>
          <h4 className="mt-3 text-xs font-semibold uppercase tracking-wider text-text-muted">崩れる条件</h4>
          <p className="mt-2 text-sm leading-7 text-text-secondary">{stock.collapseCondition}</p>
          <h4 className="mt-4 text-xs font-semibold uppercase tracking-wider text-text-muted">危険信号</h4>
          <p className="mt-2 text-sm leading-7 text-text-secondary">{stock.riskSignal}</p>
        </CollapsibleSection>

        <CollapsibleSection title="仮説ログ（検証ループ）">
          <div className="mt-3 grid gap-2">
            <label className="text-xs text-text-secondary">
              仮説
              <textarea
                value={hypothesisDraft}
                onChange={(event) => setHypothesisDraft(event.target.value)}
                placeholder="例: 営業CF改善が継続するなら buy_now 維持"
                className="mt-1 h-20 w-full rounded-lg border border-border-subtle bg-canvas-deep/80 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-primary"
              />
            </label>
            <label className="text-xs text-text-secondary">
              根拠
              <textarea
                value={rationaleDraft}
                onChange={(event) => setRationaleDraft(event.target.value)}
                placeholder="数字と散文の根拠を短く残す"
                className="mt-1 h-20 w-full rounded-lg border border-border-subtle bg-canvas-deep/80 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-primary"
              />
            </label>
            <label className="text-xs text-text-secondary">
              見直し日
              <input
                type="date"
                value={reviewDateDraft}
                onChange={(event) => setReviewDateDraft(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border-subtle bg-canvas-deep/80 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-primary"
              />
            </label>
            <label className="text-xs text-text-secondary">
              検証結果
              <textarea
                value={outcomeDraft}
                onChange={(event) => setOutcomeDraft(event.target.value)}
                placeholder="結果を簡潔に残す"
                className="mt-1 h-20 w-full rounded-lg border border-border-subtle bg-canvas-deep/80 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-primary"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSaveHypothesis}
              className="rounded-lg border border-primary/30 px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-primary/50 hover:text-text-primary"
            >
              仮説ログ保存
            </button>
            <span className="text-xs text-secondary" role="status" aria-live="polite">{hypothesisSavedLabel}</span>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="ユーザーメモ">
          <textarea
            value={memoDraft}
            onChange={(event) => setMemoDraft(event.target.value)}
            placeholder="この銘柄の判断メモを保存"
            className="mt-3 h-28 w-full rounded-lg border border-border-subtle bg-canvas-deep/80 px-3 py-3 text-sm text-text-primary outline-none transition-colors focus:border-primary"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg border border-primary/30 px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-primary/50 hover:text-text-primary"
            >
              メモ保存
            </button>
            <span className="text-xs text-secondary" role="status" aria-live="polite">{savedLabel}</span>
          </div>
        </CollapsibleSection>

        <button
          type="button"
          onClick={() => onToggleWatch(stock.id)}
          className="mt-4 w-full rounded-lg border border-primary/30 px-4 py-3 text-sm font-medium text-text-secondary transition-colors hover:border-primary/50 hover:text-text-primary"
        >
          {stock.watched ? "監視から外す" : "監視に追加"}
        </button>
      </aside>
    </>
  );
}

function HoldingSection({ stockId, price }: { stockId: string; price: number }): JSX.Element {
  const holdingsMap = useStockStore((s) => s.holdingsMap);
  const shares = holdingsMap[stockId] ?? 0;
  const stocks = useStockStore((s) => s.stocks);

  const totalPortfolioValue = useMemo(() => {
    return stocks.reduce((sum, s) => {
      const h = holdingsMap[s.id] ?? 0;
      return sum + h * s.price;
    }, 0);
  }, [stocks, holdingsMap]);

  const evalValue = shares * price;
  const ratio = totalPortfolioValue > 0 ? (evalValue / totalPortfolioValue) * 100 : 0;

  return (
    <div className="card-surface p-4">
      <HoldingInput stockId={stockId} price={price} />
      {shares > 0 && totalPortfolioValue > 0 && (
        <p className="mt-2 text-xs text-text-muted">
          保有比率: <span className="text-text-primary">{ratio.toFixed(1)}%</span>
          <span className="ml-2 text-text-muted">(ポートフォリオ全体: ¥{totalPortfolioValue.toLocaleString("ja-JP")})</span>
        </p>
      )}
    </div>
  );
}

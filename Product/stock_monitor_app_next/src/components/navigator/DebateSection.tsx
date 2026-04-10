"use client";

import { useState } from "react";

import clsx from "clsx";

import type { DebateResult, DebateSignal, DebatePriority, ConvergenceStatus, DebateVerdict, PanelistVote } from "@/types/navigator";
import { useNavigatorStore } from "@/store/useNavigatorStore";
import { useStockStore } from "@/store/useStockStore";
import { ConfidenceBar } from "./ConfidenceBar";
import { resolveDebateConfidence } from "./confidence";

// ── Signal config ───────────────────────────────────────

const SIGNAL_CONFIG: Record<
  DebateSignal,
  { label: string; border: string; badge: string }
> = {
  go: {
    label: "🟢 採用",
    border: "border-positive/40",
    badge: "bg-positive/10 text-positive border-positive/30",
  },
  watch: {
    label: "🟡 条件付",
    border: "border-amber/40",
    badge: "bg-amber/10 text-amber border-amber/30",
  },
  out: {
    label: "🔴 除外",
    border: "border-danger/40",
    badge: "bg-danger/10 text-danger border-danger/30",
  },
};

const PRIORITY_COLOR: Record<DebatePriority, string> = {
  高: "text-positive",
  中: "text-amber",
  低: "text-text-muted",
};

const PANELIST_ICON: Record<PanelistVote["role"], string> = {
  "バリュー投資家": "💎",
  "投資未経験者": "🔰",
  "成長株アナリスト": "📈",
  "リスク管理者": "🛡️",
  "マクロストラテジスト": "🌍",
};

const VOTE_COLOR: Record<DebateSignal, string> = {
  go: "text-positive",
  watch: "text-amber",
  out: "text-danger",
};

const CONVERGENCE_STYLE: Record<ConvergenceStatus, string> = {
  "🟢採用": "border-positive/40 bg-positive/10 text-positive",
  "🟡条件付き": "border-amber/40 bg-amber/10 text-amber",
  "🔴除外": "border-danger/40 bg-danger/10 text-danger",
};

// ── Panel Votes Row ─────────────────────────────────────

function PanelVotesRow({ votes }: { votes: PanelistVote[] }): JSX.Element {
  return (
    <div className="flex flex-wrap gap-1.5">
      {votes.map((vote) => (
        <div
          key={vote.role}
          className="group relative flex items-center gap-1 border border-glass-border bg-panel px-1.5 py-0.5"
          title={`${vote.role}: ${vote.reason}`}
        >
          <span className="text-xs">{PANELIST_ICON[vote.role] ?? "👤"}</span>
          <span className={clsx("font-mono tabular-nums text-[9px] font-bold", VOTE_COLOR[vote.signal])}>
            {vote.signal.toUpperCase()}
          </span>
          {/* Tooltip */}
          <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full opacity-0 transition-opacity group-hover:opacity-100">
            <div className="w-48 border border-glass-border bg-panel-solid p-2 shadow-lg">
              <p className="font-mono tabular-nums text-[9px] font-bold text-text-primary">{vote.role}</p>
              <p className="mt-0.5 font-mono tabular-nums text-[9px] leading-relaxed text-text-secondary">{vote.reason}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Single Verdict Card ─────────────────────────────────

function VerdictCard({ v }: { v: DebateVerdict }): JSX.Element {
  const excludeInstrument = useNavigatorStore((s) => s.excludeInstrument);
  const stocks = useStockStore((s) => s.stocks);
  const setHolding = useStockStore((s) => s.setHolding);
  const registerSearchedStock = useStockStore((s) => s.registerSearchedStock);

  const [quantity, setQuantity] = useState(100);
  const [message, setMessage] = useState<string | null>(null);

  const handleRemove = () => {
    excludeInstrument(v.code);
    setMessage("この銘柄を分析結果から除外しました。");
  };

  const handleAddPortfolio = async () => {
    const qty = Math.max(1, Math.floor(quantity));
    const existing = stocks.find((s) => s.code === v.code);

    if (existing) {
      setHolding(existing.id, qty);
      setMessage(`ポートフォリオに ${qty} 株追加しました。`);
      return;
    }

    if (/^\d{4}$/.test(v.code)) {
      const result = await registerSearchedStock({
        code: v.code,
        name: v.code,
        sector: "未分類",
        oneLiner: "Navigator selected",
        summary: "AI Navigator recommendation",
      });

      if (result.ok) {
        const refreshed = useStockStore.getState().stocks.find((s) => s.code === v.code);
        if (refreshed) {
          setHolding(refreshed.id, qty);
          setMessage(`ポートフォリオに ${qty} 株追加しました。`);
          return;
        }
      }
    }

    setMessage("この銘柄は現在の銘柄リストに追加できませんでした。");
  };

  const cfg = SIGNAL_CONFIG[v.signal];

  return (
    <div
      className={clsx(
        "border bg-panel-hover p-3 transition-colors hover:bg-panel-elevated",
        cfg.border,
      )}
    >
      {/* Header: code + signal badge */}
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono tabular-nums text-base font-bold text-text-primary">
          {v.code}
        </span>
        <span
          className={clsx(
            "inline-block border px-2 py-0.5 font-mono tabular-nums text-[10px]",
            cfg.badge,
          )}
        >
          {cfg.label}
        </span>
      </div>

      {/* Priority + Convergence */}
      <div className="mb-2 flex items-center gap-3 font-mono tabular-nums text-[10px]">
        <span>
          <span className="text-text-muted">優先度: </span>
          <span className={PRIORITY_COLOR[v.priority] ?? "text-text-muted"}>
            {v.priority}
          </span>
        </span>
        {v.convergence && (
          <span className={clsx(
            "inline-block border px-1.5 py-0.5",
            CONVERGENCE_STYLE[v.convergence] ?? "border-glass-border text-text-muted",
          )}>
            {v.convergence}
          </span>
        )}
      </div>

      <div className="mb-2">
        <ConfidenceBar confidence={resolveDebateConfidence(v)} compact delayMs={80} />
      </div>

      {/* Panel Votes */}
      {v.panelVotes && v.panelVotes.length > 0 && (
        <div className="mb-2">
          <PanelVotesRow votes={v.panelVotes} />
        </div>
      )}

      {/* Pro / Con */}
      <div className="space-y-1">
        <p className="font-mono tabular-nums text-xs leading-relaxed text-positive/80">
          <span className="mr-1 text-text-muted">+</span>
          {v.pro}
        </p>
        <p className="font-mono tabular-nums text-xs leading-relaxed text-amber/80">
          <span className="mr-1 text-text-muted">−</span>
          {v.con}
        </p>
      </div>

      {/* CF note */}
      <div className="mt-2 border-t border-glass-border pt-2">
        <p className="font-mono tabular-nums text-[10px] leading-relaxed text-text-muted">
          CF: {v.cfNote}
        </p>
      </div>

      <div className="mt-3 border-t border-glass-border pt-2">
        <div className="flex flex-wrap items-end gap-2">
          <label className="font-mono tabular-nums text-[10px] text-text-muted">
            株数
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              className="ml-2 w-20 rounded border border-glass-border bg-panel px-2 py-1 text-xs text-text-primary"
            />
          </label>
          <button
            type="button"
            onClick={() => { void handleAddPortfolio(); }}
            className="rounded border border-primary/30 bg-primary/10 px-2 py-1 font-mono tabular-nums text-[10px] text-primary transition-colors hover:bg-primary/20"
          >
            ポートフォリオ追加
          </button>
          <button
            type="button"
            onClick={handleRemove}
            className="rounded border border-danger/40 bg-danger/10 px-2 py-1 font-mono tabular-nums text-[10px] text-danger transition-colors hover:bg-danger/20"
          >
            カード削除
          </button>
        </div>
        {message && (
          <p className="mt-2 font-mono tabular-nums text-[10px] text-text-muted">{message}</p>
        )}
      </div>
    </div>
  );
}

// ── Component ───────────────────────────────────────────

interface DebateSectionProps {
  debate: DebateResult;
}

export function DebateSection({ debate }: DebateSectionProps): JSX.Element {
  return (
    <section className="animate-fade-in border border-glass-border bg-panel p-4">
      <h3 className="mb-3 font-semibold text-[10px] uppercase tracking-widest text-text-muted">
        ▸ CONVERGENCE DEBATE
      </h3>
      <div className="mb-4 flex flex-wrap gap-2 font-mono tabular-nums text-[10px] uppercase tracking-wide text-text-muted">
        <span className="rounded border border-primary/20 bg-primary/5 px-2 py-0.5">
          confbar = per-symbol certainty
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {debate.verdicts.map((v) => (
          <VerdictCard key={v.code} v={v} />
        ))}
      </div>
    </section>
  );
}

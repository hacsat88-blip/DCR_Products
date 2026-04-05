"use client";

import clsx from "clsx";

import type { DebateResult, DebateSignal } from "@/types/navigator";

// ── Signal config ───────────────────────────────────────

const SIGNAL_CONFIG: Record<
  DebateSignal,
  { label: string; border: string; badge: string }
> = {
  go: {
    label: "🟢 採用",
    border: "border-mint/40",
    badge: "bg-mint/10 text-mint border-mint/30",
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

const PRIORITY_COLOR: Record<string, string> = {
  高: "text-mint",
  中: "text-amber",
  低: "text-text-muted",
};

// ── Component ───────────────────────────────────────────

interface DebateSectionProps {
  debate: DebateResult;
}

export function DebateSection({ debate }: DebateSectionProps): JSX.Element {
  return (
    <section className="animate-fade-in border border-glass-border bg-panel p-4">
      <h3 className="mb-4 font-orb text-[10px] uppercase tracking-widest text-text-muted">
        ▸ CONVERGENCE DEBATE
      </h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {debate.verdicts.map((v) => {
          const cfg = SIGNAL_CONFIG[v.signal];

          return (
            <div
              key={v.code}
              className={clsx(
                "border bg-panel-hover p-3 transition-colors hover:bg-panel-elevated",
                cfg.border,
              )}
            >
              {/* Header: code + signal badge */}
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono-tech text-base font-bold text-text-primary">
                  {v.code}
                </span>
                <span
                  className={clsx(
                    "inline-block border px-2 py-0.5 font-mono-tech text-[10px]",
                    cfg.badge,
                  )}
                >
                  {cfg.label}
                </span>
              </div>

              {/* Priority */}
              <div className="mb-2 font-mono-tech text-[10px]">
                <span className="text-text-muted">優先度: </span>
                <span className={PRIORITY_COLOR[v.priority] ?? "text-text-muted"}>
                  {v.priority}
                </span>
              </div>

              {/* Pro / Con */}
              <div className="space-y-1">
                <p className="font-mono-tech text-xs leading-relaxed text-mint/80">
                  <span className="mr-1 text-text-muted">+</span>
                  {v.pro}
                </p>
                <p className="font-mono-tech text-xs leading-relaxed text-amber/80">
                  <span className="mr-1 text-text-muted">−</span>
                  {v.con}
                </p>
              </div>

              {/* CF note */}
              <div className="mt-2 border-t border-glass-border pt-2">
                <p className="font-mono-tech text-[10px] leading-relaxed text-text-muted">
                  CF: {v.cfNote}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

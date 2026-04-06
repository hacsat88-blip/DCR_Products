"use client";

import clsx from "clsx";

import type { MacroResult, MarketEnvironment } from "@/types/navigator";

// ── Environment colour mapping ──────────────────────────

const ENV_DOT: Record<MarketEnvironment, string> = {
  bullish: "bull",
  neutral: "neutral",
  bearish: "bear",
};

const ENV_GLOW: Record<MarketEnvironment, string> = {
  bullish: "text-positive",
  neutral: "text-amber",
  bearish: "text-danger",
};

// ── Stars helper ────────────────────────────────────────

function StarRating({ count }: { count: number }): JSX.Element {
  const filled = Math.max(0, Math.min(5, Math.round(count)));
  return (
    <span className="font-mono tabular-nums text-xs tracking-wider text-amber">
      {"★".repeat(filled)}
      <span className="text-text-muted">{"☆".repeat(5 - filled)}</span>
    </span>
  );
}

// ── Component ───────────────────────────────────────────

interface MacroSectionProps {
  macro: MacroResult;
}

export function MacroSection({ macro }: MacroSectionProps): JSX.Element {
  const { environment, label, sectors, risks, chain } = macro;

  return (
    <section className="animate-fade-in border border-glass-border bg-panel p-4">
      {/* Section title */}
      <h3 className="mb-4 font-semiboldtext-[10px] uppercase tracking-widest text-text-muted">
        ▸ MACRO ENVIRONMENT
      </h3>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* ── Column 1: Environment assessment ── */}
        <div className="flex flex-col items-center justify-center gap-2 border-r border-glass-border pr-4 sm:items-start">
          <div
            className={clsx(
              "signal-dot !h-4 !w-4",
              ENV_DOT[environment],
            )}
          />
          <span
            className={clsx(
              "font-semiboldtext-lg font-bold",
              ENV_GLOW[environment],
            )}
          >
            {label}
          </span>
          {chain && (
            <p className="mt-1 font-mono tabular-nums text-[10px] leading-relaxed text-text-muted">
              {chain}
            </p>
          )}
        </div>

        {/* ── Column 2: Sectors ── */}
        <div>
          <h4 className="mb-2 font-semiboldtext-[10px] uppercase tracking-widest text-text-muted">
            SECTORS
          </h4>
          <ol className="space-y-1.5">
            {sectors.map((s, i) => (
              <li key={s.name} className="font-mono tabular-nums text-sm text-text-primary">
                <span className="mr-1.5 text-text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {s.name}
                <p className="ml-6 text-[10px] leading-snug text-text-muted">
                  {s.reason}
                </p>
              </li>
            ))}
          </ol>
        </div>

        {/* ── Column 3: Risk factors ── */}
        <div>
          <h4 className="mb-2 font-semiboldtext-[10px] uppercase tracking-widest text-text-muted">
            RISK FACTORS
          </h4>
          <ul className="space-y-1.5">
            {risks.map((r) => (
              <li
                key={r.name}
                className="flex items-center gap-2 font-mono tabular-nums text-sm text-text-primary"
              >
                <StarRating count={r.stars} />
                <span>{r.name}</span>
                <span className="text-text-muted">{r.trend}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

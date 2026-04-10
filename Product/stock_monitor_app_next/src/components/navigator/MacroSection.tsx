"use client";

import { useState } from "react";

import clsx from "clsx";

import type {
  MacroResult,
  MarketEnvironment,
  GeopoliticalRisk,
  EconomicIndicator,
  CentralBankPolicy,
  MarketSentiment,
  VIXAlert,
} from "@/types/navigator";

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

const ENV_BG: Record<MarketEnvironment, string> = {
  bullish: "border-positive/30 bg-positive/5",
  neutral: "border-amber/30 bg-amber/5",
  bearish: "border-danger/30 bg-danger/5",
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

// ── VIX Gauge ───────────────────────────────────────────

function VIXGauge({ alert }: { alert: VIXAlert }): JSX.Element | null {
  if (alert.level == null) return null;
  const level = alert.level;
  const pct = Math.min(100, (level / 80) * 100);
  const isHigh = alert.isAbnormal;

  return (
    <div className={clsx(
      "border p-3",
      isHigh ? "border-danger/40 bg-danger/5" : "border-glass-border bg-panel",
    )}>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono tabular-nums text-[10px] uppercase tracking-widest text-text-muted">
          VIX INDEX
        </span>
        <span className={clsx(
          "font-mono tabular-nums text-lg font-bold",
          isHigh ? "text-danger animate-pulse" : level > 20 ? "text-amber" : "text-positive",
        )}>
          {level.toFixed(1)}
        </span>
      </div>
      <div className="h-2 w-full bg-text-muted/10 overflow-hidden">
        <div
          className={clsx(
            "h-full transition-all duration-700",
            isHigh ? "bg-danger" : level > 20 ? "bg-amber" : "bg-positive",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between font-mono tabular-nums text-[8px] text-text-muted">
        <span>0</span>
        <span>20</span>
        <span>30</span>
        <span>80</span>
      </div>
      {alert.reason && !isHigh && (
        <p className={clsx(
          "mt-2 font-mono tabular-nums text-[10px]",
          "text-text-muted",
        )}>
          {alert.reason}
        </p>
      )}
    </div>
  );
}

// ── Economic Indicator Card ─────────────────────────────

function IndicatorCard({ ind }: { ind: EconomicIndicator }): JSX.Element {
  const impactColor = ind.impact === "positive"
    ? "text-positive"
    : ind.impact === "negative"
      ? "text-danger"
      : "text-text-muted";

  return (
    <div className="border border-glass-border bg-panel p-2.5">
      <div className="flex items-center justify-between">
        <span className="font-mono tabular-nums text-[10px] text-text-muted">{ind.name}</span>
        <span className="text-sm text-text-secondary">{ind.trend}</span>
      </div>
      <div className="mt-1">
        <span className={clsx("font-mono tabular-nums text-sm font-bold", impactColor)}>
          {ind.value}
        </span>
      </div>
    </div>
  );
}

// ── Geopolitical Risk Card ──────────────────────────────

function GeoRiskCard({ risk }: { risk: GeopoliticalRisk }): JSX.Element {
  return (
    <div className={clsx(
      "border p-2.5",
      risk.severity >= 4 ? "border-danger/40 bg-danger/5" : "border-glass-border bg-panel",
    )}>
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono tabular-nums text-xs font-bold text-text-primary">
          {risk.event}
        </span>
        <span className="text-sm text-text-secondary">{risk.trend}</span>
      </div>
      <div className="mb-1.5 flex items-center gap-2">
        <StarRating count={risk.severity} />
        <span className="font-mono tabular-nums text-[10px] text-text-muted">{risk.region}</span>
      </div>
      <p className="font-mono tabular-nums text-[10px] leading-relaxed text-text-secondary">
        {risk.impact}
      </p>
      {risk.affectedSectors.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {risk.affectedSectors.map((s) => (
            <span
              key={s}
              className="inline-block border border-glass-border px-1.5 py-0.5 font-mono tabular-nums text-[9px] text-text-muted"
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Central Bank Tab ────────────────────────────────────

function CentralBankTabs({ policies }: { policies: CentralBankPolicy[] }): JSX.Element {
  const [activeBank, setActiveBank] = useState<string>(policies[0]?.bank ?? "FRB");
  const active = policies.find((p) => p.bank === activeBank);

  const dirColor = (d: string) =>
    d === "hawkish" ? "text-danger" : d === "dovish" ? "text-positive" : "text-amber";

  return (
    <div className="border border-glass-border bg-panel">
      <div className="flex border-b border-glass-border">
        {policies.map((p) => (
          <button
            key={p.bank}
            type="button"
            onClick={() => setActiveBank(p.bank)}
            className={clsx(
              "flex-1 px-3 py-1.5 font-mono tabular-nums text-[10px] uppercase tracking-widest transition-colors",
              activeBank === p.bank
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-text-muted hover:text-text-secondary",
            )}
          >
            {p.bank}
          </button>
        ))}
      </div>
      {active && (
        <div className="p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono tabular-nums text-[10px] text-text-muted">スタンス:</span>
            <span className="font-mono tabular-nums text-xs text-text-primary">{active.stance}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono tabular-nums text-[10px] text-text-muted">金利方向:</span>
            <span className={clsx("font-mono tabular-nums text-xs font-bold", dirColor(active.rateDirection))}>
              {active.rateDirection.toUpperCase()}
            </span>
          </div>
          <p className="mt-1 font-mono tabular-nums text-[10px] leading-relaxed text-text-secondary">
            {active.keyPoint}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Sentiment Badge ─────────────────────────────────────

function SentimentBadge({ sentiment }: { sentiment: MarketSentiment }): JSX.Element {
  const phaseColor = sentiment.marketPhase === "risk-on"
    ? "text-positive border-positive/30 bg-positive/5"
    : sentiment.marketPhase === "risk-off"
      ? "text-danger border-danger/30 bg-danger/5"
      : "text-amber border-amber/30 bg-amber/5";

  return (
    <div className="flex flex-wrap gap-2">
      <span className={clsx("inline-block border px-2 py-0.5 font-mono tabular-nums text-[10px]", phaseColor)}>
        {sentiment.marketPhase.toUpperCase()}
      </span>
      <span className="inline-block border border-glass-border px-2 py-0.5 font-mono tabular-nums text-[10px] text-text-muted">
        通貨リスク: {sentiment.currencyRisk.toUpperCase()}
      </span>
      <span className="inline-block border border-glass-border px-2 py-0.5 font-mono tabular-nums text-[10px] text-text-muted">
        債券利回り: {sentiment.bondYieldTrend}
      </span>
    </div>
  );
}

// ── Component ───────────────────────────────────────────

interface MacroSectionProps {
  macro: MacroResult;
}

export function MacroSection({ macro }: MacroSectionProps): JSX.Element {
  const {
    environment, label, sectors, risks, chain,
    geopoliticalRisks, sentiment, economicIndicators,
    centralBankPolicies, vixAlert,
  } = macro;

  return (
    <section className="animate-fade-in border border-glass-border bg-panel p-4">
      {/* Section title */}
      <h3 className="mb-4 font-semibold text-[10px] uppercase tracking-widest text-text-muted">
        ▸ MACRO ENVIRONMENT
      </h3>

      {/* ── Environment Banner ── */}
      <div className={clsx("mb-4 flex items-center gap-3 border p-3", ENV_BG[environment])}>
        <div className={clsx("signal-dot !h-5 !w-5", ENV_DOT[environment])} />
        <span className={clsx("text-lg font-bold", ENV_GLOW[environment])}>
          {label}
        </span>
        {sentiment && <SentimentBadge sentiment={sentiment} />}
      </div>

      {chain && (
        <p className="mb-4 font-mono tabular-nums text-[10px] leading-relaxed text-text-muted">
          {chain}
        </p>
      )}

      {/* ── VIX Alert ── */}
      {vixAlert && <div className="mb-4"><VIXGauge alert={vixAlert} /></div>}

      {/* ── News / Geopolitical Brief (prioritized) ── */}
      {geopoliticalRisks && geopoliticalRisks.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 font-semibold text-[10px] uppercase tracking-widest text-text-muted">
            NEWS / GEOPOLITICAL BRIEF
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {geopoliticalRisks.map((gr, i) => (
              <GeoRiskCard key={`${gr.event}-${i}`} risk={gr} />
            ))}
          </div>
        </div>
      )}

      {/* ── Economic Indicators (folded) ── */}
      {economicIndicators && economicIndicators.length > 0 && (
        <details className="mb-4 border border-glass-border bg-panel p-3">
          <summary className="cursor-pointer font-semibold text-[10px] uppercase tracking-widest text-text-muted">
            ECONOMIC INDICATORS (詳細)
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {economicIndicators.map((ind) => (
              <IndicatorCard key={ind.name} ind={ind} />
            ))}
          </div>
        </details>
      )}

      {/* ── 3-column: Sectors / Risks / Central Banks ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Column 1: Sectors */}
        <div>
          <h4 className="mb-2 font-semibold text-[10px] uppercase tracking-widest text-text-muted">
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

        {/* Column 2: Risk factors */}
        <div>
          <h4 className="mb-2 font-semibold text-[10px] uppercase tracking-widest text-text-muted">
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

        {/* Column 3: Central Bank Policies */}
        <div>
          {centralBankPolicies && centralBankPolicies.length > 0 ? (
            <>
              <h4 className="mb-2 font-semibold text-[10px] uppercase tracking-widest text-text-muted">
                CENTRAL BANKS
              </h4>
              <CentralBankTabs policies={centralBankPolicies} />
            </>
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* Geopolitical cards are displayed in the prioritized brief above. */}
    </section>
  );
}

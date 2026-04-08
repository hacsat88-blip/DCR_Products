"use client";

import { useNavigatorStore } from "@/store/useNavigatorStore";
import type { MarketScope, RiskTolerance, InvestmentHorizon } from "@/types/navigator";

import { MacroSection } from "./MacroSection";
import { StocksTable } from "./StocksTable";
import { DebateSection } from "./DebateSection";
import { BestPicksSection } from "./BestPicksSection";
import { RiskMatrixSection } from "./RiskMatrixSection";
import { NavigatorLiveTerminal } from "./NavigatorLiveTerminal";

// ── Label maps ──────────────────────────────────────────

const MARKET_LABEL: Record<MarketScope, string> = {
  US: "US",
  JP: "JP",
  BOTH: "US+JP",
};

const RISK_LABEL: Record<RiskTolerance, string> = {
  low: "LOW",
  mid: "MID",
  high: "HIGH",
};

const HORIZON_LABEL: Record<InvestmentHorizon, string> = {
  short: "SHORT",
  mid: "MID",
  long: "LONG",
};

// ── Component ───────────────────────────────────────────

/**
 * NavigatorResultsPanel
 *
 * Orchestrates the full display of the AI Investment Navigator's
 * 4-stage pipeline output in a 2-column layout:
 * - LEFT: Results (macro, stocks, debate, best picks, risk matrix)
 * - RIGHT: Live terminal with typewriter logs and completed stage accordion
 */
export function NavigatorResultsPanel(): JSX.Element | null {
  const {
    status,
    progress,
    steps,
    intervention,
    macro,
    stocks,
    debate,
    final: finalEval,
    settings,
    analysisMode,
    executedAt,
    recommendationDiffs,
  } = useNavigatorStore();

  // Nothing to show yet
  if (status === "idle" && !macro) return null;

  // Derive display labels
  const marketLabel = settings ? MARKET_LABEL[settings.market] : "—";
  const riskLabel = settings ? RISK_LABEL[settings.risk] : "—";
  const horizonLabel = settings ? HORIZON_LABEL[settings.horizon] : "—";
  const diffCount = Object.keys(recommendationDiffs).length;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* ── LEFT COLUMN: Results ── */}
      <div className="space-y-5 lg:col-span-2">
        {/* ── Meta header ── */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono tabular-nums text-xs text-text-muted">
          <span>
            {marketLabel} {"//"} RISK:{riskLabel} {"//"} HORIZON:{horizonLabel}
          </span>
          {analysisMode && (
            <span
              className={
                analysisMode === "live"
                  ? "rounded border border-positive/30 bg-positive/10 px-1.5 py-0.5 text-positive"
                  : "rounded border border-yellow-500/40 bg-yellow-500/10 px-1.5 py-0.5 text-yellow-300"
              }
            >
              SOURCE: {analysisMode === "live" ? "LIVE AI" : "MOCK FALLBACK"}
            </span>
          )}
          {executedAt && (
            <span>
              {"//"} {new Date(executedAt).toLocaleDateString("ja-JP")}
            </span>
          )}
        </div>

        <section className="rounded-xl border border-primary/15 bg-panel-hover p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono tabular-nums text-[10px] uppercase tracking-widest text-text-muted">
              navigator flow hub
            </p>
            <p className="font-mono tabular-nums text-[10px] uppercase tracking-wide text-primary/80">
              {`progress ${Math.round(progress)}%`}
            </p>
          </div>
          <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {steps.map((step) => (
              <div
                key={step.step}
                className="rounded border border-primary/15 bg-canvas px-2 py-1.5 font-mono tabular-nums text-[10px] text-text-muted"
              >
                <p className="truncate uppercase tracking-wide">{step.label}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-text-secondary">
                  {step.status}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums text-[10px] uppercase tracking-wide text-text-muted">
            {intervention && (
              <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">
                {`intervention S${intervention.completedStep + 1}→S${intervention.nextStep + 1}`}
              </span>
            )}
            {diffCount > 0 && (
              <span className="rounded border border-amber/35 bg-amber/10 px-2 py-0.5 text-amber">
                {`diff/new active ${diffCount}`}
              </span>
            )}
          </div>
        </section>

        {/* ── STATE 1: Macro Environment ── */}
        {macro && <MacroSection macro={macro} />}

        {/* ── STATE 2 + 3: Stocks Table (with debate signals merged) ── */}
        {stocks && debate && <StocksTable stocks={stocks} debate={debate} />}

        {/* ── STATE 3: Debate Verdicts ── */}
        {debate && <DebateSection debate={debate} />}

        {/* ── STATE 4: Best Picks ── */}
        {finalEval && (
          <BestPicksSection
            bestStocks={finalEval.bestStocks}
            bestFunds={finalEval.bestFunds}
            debate={debate}
            recommendationDiffs={recommendationDiffs}
          />
        )}

        {/* ── STATE 4: Risk Matrix + Allocation ── */}
        {finalEval && (
          <RiskMatrixSection
            matrix={finalEval.matrix}
            alloc={finalEval.alloc}
            corrMatrix={finalEval.corrMatrix}
          />
        )}

        {/* ── Disclaimer ── */}
        <div className="border-t border-primary/10 pt-3 font-mono tabular-nums text-[10px] leading-relaxed text-text-muted">
          ⚠️ 本分析は情報提供・教育目的のみです。投資は自己責任で行い、必要に応じてFAへご相談ください。
        </div>
      </div>

      {/* ── RIGHT COLUMN: Live Terminal ── */}
      <div className="lg:col-span-1">
        <NavigatorLiveTerminal />
      </div>
    </div>
  );
}

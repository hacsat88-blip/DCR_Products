"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";

import { useNavigatorStore } from "@/store/useNavigatorStore";
import type { MarketScope, RiskTolerance, InvestmentHorizon } from "@/types/navigator";

const MacroSection = dynamic(() => import("./MacroSection").then(m => m.MacroSection), { ssr: false });
const StocksTable = dynamic(() => import("./StocksTable").then(m => m.StocksTable), { ssr: false });
const DebateSection = dynamic(() => import("./DebateSection").then(m => m.DebateSection), { ssr: false });
const BestPicksSection = dynamic(() => import("./BestPicksSection").then(m => m.BestPicksSection), { ssr: false });
const RiskMatrixSection = dynamic(() => import("./RiskMatrixSection").then(m => m.RiskMatrixSection), { ssr: false });

import { VIXAlertBanner } from "./VIXAlertBanner";
import { NavigatorLiveTerminal } from "./NavigatorLiveTerminal";
import { PipelineStepper, motion, fadeUpVariants, AnimatePresence } from "@/components/ui/MotionPrimitives";

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
  const status = useNavigatorStore((s) => s.status);
  const progress = useNavigatorStore((s) => s.progress);
  const steps = useNavigatorStore((s) => s.steps);
  const intervention = useNavigatorStore((s) => s.intervention);
  const macro = useNavigatorStore((s) => s.macro);
  const stocks = useNavigatorStore((s) => s.stocks);
  const debate = useNavigatorStore((s) => s.debate);
  const finalEval = useNavigatorStore((s) => s.final);
  const settings = useNavigatorStore((s) => s.settings);
  const analysisMode = useNavigatorStore((s) => s.analysisMode);
  const executedAt = useNavigatorStore((s) => s.executedAt);
  const recommendationDiffs = useNavigatorStore((s) => s.recommendationDiffs);

  const stepperSteps = useMemo(
    () =>
      steps.map((s) => ({
        label: s.label,
        status: s.status === "running" ? "running" as const : s.status === "done" ? "done" as const : s.status === "error" ? "error" as const : "idle" as const,
      })),
    [steps],
  );

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
          <PipelineStepper
            steps={stepperSteps}
          />
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

        {/* ── VIX Alert Banner ── */}
        <AnimatePresence mode="wait">
          {macro?.vixAlert && (
            <motion.div key="vix-alert" variants={fadeUpVariants} initial="hidden" animate="visible" exit="exit">
              <VIXAlertBanner alert={macro.vixAlert} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STATE 1: Macro Environment ── */}
        <AnimatePresence mode="wait">
          {macro && (
            <motion.div key="macro" variants={fadeUpVariants} initial="hidden" animate="visible" exit="exit">
              <MacroSection macro={macro} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STATE 2 + 3: Stocks Table (with debate signals merged) ── */}
        <AnimatePresence mode="wait">
          {stocks && debate && (
            <motion.div key="stocks" variants={fadeUpVariants} initial="hidden" animate="visible" exit="exit">
              <StocksTable stocks={stocks} debate={debate} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STATE 3: Debate Verdicts ── */}
        <AnimatePresence mode="wait">
          {debate && (
            <motion.div key="debate" variants={fadeUpVariants} initial="hidden" animate="visible" exit="exit">
              <DebateSection debate={debate} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STATE 4: Best Picks ── */}
        <AnimatePresence mode="wait">
          {finalEval && (
            <motion.div key="bestpicks" variants={fadeUpVariants} initial="hidden" animate="visible" exit="exit">
              <BestPicksSection
                bestStocks={finalEval.bestStocks}
                bestFunds={finalEval.bestFunds}
                debate={debate}
                recommendationDiffs={recommendationDiffs}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STATE 4: Risk Matrix + Allocation ── */}
        <AnimatePresence mode="wait">
          {finalEval && (
            <motion.div key="riskmatrix" variants={fadeUpVariants} initial="hidden" animate="visible" exit="exit">
              <RiskMatrixSection
                matrix={finalEval.matrix}
                alloc={finalEval.alloc}
                corrMatrix={finalEval.corrMatrix}
              />
            </motion.div>
          )}
        </AnimatePresence>

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

"use client";

import { useNavigatorStore } from "@/store/useNavigatorStore";
import type { MarketScope, RiskTolerance, InvestmentHorizon } from "@/types/navigator";

import { MacroSection } from "./MacroSection";
import { StocksTable } from "./StocksTable";
import { DebateSection } from "./DebateSection";
import { BestPicksSection } from "./BestPicksSection";
import { RiskMatrixSection } from "./RiskMatrixSection";

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
 * 4-stage pipeline output. Renders conditionally — returns null
 * when no results are available.
 */
export function NavigatorResultsPanel(): JSX.Element | null {
  const {
    status,
    macro,
    stocks,
    debate,
    final: finalEval,
    settings,
    analysisMode,
    executedAt,
  } = useNavigatorStore();

  // Nothing to show yet
  if (status === "idle" && !macro) return null;

  // Derive display labels
  const marketLabel = settings ? MARKET_LABEL[settings.market] : "—";
  const riskLabel = settings ? RISK_LABEL[settings.risk] : "—";
  const horizonLabel = settings ? HORIZON_LABEL[settings.horizon] : "—";

  return (
    <div className="space-y-4">
      {/* ── Meta header ── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono-tech text-xs text-text-muted">
        <span>
          {marketLabel} {"//"} RISK:{riskLabel} {"//"} HORIZON:{horizonLabel}
        </span>
        {analysisMode && (
          <span
            className={
              analysisMode === "live"
                ? "rounded border border-mint/30 bg-mint/10 px-1.5 py-0.5 text-mint"
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
      <div className="border-t border-mint/10 pt-3 font-mono-tech text-[10px] leading-relaxed text-text-muted">
        ⚠️ 本分析は情報提供・教育目的のみです。投資は自己責任で行い、必要に応じてFAへご相談ください。
      </div>
    </div>
  );
}

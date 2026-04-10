// ────────────────────────────────────────────────
// Market Abnormality Guard
// ────────────────────────────────────────────────
//
// Checks for extreme market conditions (VIX > 30, circuit breakers)
// before allowing the Navigator pipeline to proceed past Stage 0.

import type { VIXAlert } from "@/types/navigator";
import type { MacroMarketData } from "@/services/marketDataFetcher";

/** VIX threshold above which the market is considered abnormal. */
const VIX_ABNORMAL_THRESHOLD = 30;

/**
 * Inspects live market data for abnormal conditions.
 * Returns a VIXAlert indicating whether the pipeline should halt.
 */
export function checkMarketAbnormality(marketData: MacroMarketData): VIXAlert {
  const vixQuote = marketData.indices.find(
    (q) => q.symbol === "^VIX" || q.label === "VIX",
  );

  const vixLevel = vixQuote?.price ?? null;

  if (vixLevel != null && vixLevel >= VIX_ABNORMAL_THRESHOLD) {
    return {
      isAbnormal: true,
      level: vixLevel,
      reason: `VIX ${vixLevel.toFixed(1)} — 高ボラティリティ状態を検知しました（閾値: ${VIX_ABNORMAL_THRESHOLD}）。`,
      recommendation:
        "通常の銘柄選定は推奨しません。キャッシュ待機またはディフェンシブ資産への退避を検討してください。",
    };
  }

  return {
    isAbnormal: false,
    level: vixLevel,
    reason: null,
    recommendation: null,
  };
}

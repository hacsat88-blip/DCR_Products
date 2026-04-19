export interface PortfolioChatContextRow {
  code: string;
  marketValueJpy: number;
  costJpy: number;
  pnlJpy: number;
  weightPercent: number;
  currentPrice: number | null;
}

function formatSignedYen(value: number): string {
  return `${value >= 0 ? "+" : "-"}${Math.round(Math.abs(value)).toLocaleString()}`;
}

function formatSignedPercent(value: number): string {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value).toFixed(1)}%`;
}

export function buildPortfolioChatContext(
  rows: PortfolioChatContextRow[],
): string {
  if (rows.length === 0) {
    return "保有銘柄は未登録です。一般的な観点を優先し、次に確認すべきリスクや候補条件を明示してください。";
  }

  const sorted = [...rows].sort((a, b) => b.marketValueJpy - a.marketValueJpy);
  const totalCost = sorted.reduce((sum, row) => sum + row.costJpy, 0);
  const totalPnl = sorted.reduce((sum, row) => sum + row.pnlJpy, 0);
  const pnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const topWeights = sorted
    .slice(0, 3)
    .map((row) => `${row.code} ${row.weightPercent.toFixed(1)}%`)
    .join(" / ");
  const topHolding = sorted[0];
  const missingPrices = sorted.filter((row) => row.currentPrice == null).length;

  const riskCue =
    topHolding.weightPercent >= 50
      ? `${topHolding.code} ${topHolding.weightPercent.toFixed(1)}%で集中気味。`
      : sorted.some((row) => row.pnlJpy < 0)
        ? "一部に含み損ポジションあり。"
        : "極端な集中は見られません。";

  const missingCue =
    missingPrices > 0
      ? ` ${missingPrices}銘柄は価格未取得のため概算です。`
      : "";

  return `保有 ${rows.length}銘柄。構成: ${topWeights}。評価損益 ${formatSignedYen(totalPnl)}円 (${formatSignedPercent(pnlPercent)})。${riskCue}${missingCue}`;
}

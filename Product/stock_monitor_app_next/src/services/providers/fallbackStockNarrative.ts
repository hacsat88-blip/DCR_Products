import { Fundamentals, Quote } from "./types";

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatDecimal(value: number, digits = 1): string {
  return value
    .toFixed(digits)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*[1-9])0+$/, "$1");
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatDecimal(value)}%`;
}

function formatPercent(value: number): string {
  return `${formatDecimal(value)}%`;
}

function resolveCoreKpiValue(data: {
  changePercent: number | null | undefined;
  revenueGrowth: number | null | undefined;
  opGrowth: number | null | undefined;
  operatingCF: number | null | undefined;
  dividendYield: number | null | undefined;
  per: number | null | undefined;
  pbr: number | null | undefined;
}): { label: string; value: string } {
  if (isFiniteNumber(data.revenueGrowth)) {
    return { label: "売上成長率", value: formatSignedPercent(data.revenueGrowth) };
  }
  if (isFiniteNumber(data.opGrowth)) {
    return { label: "営業益成長率", value: formatSignedPercent(data.opGrowth) };
  }
  if (isFiniteNumber(data.operatingCF)) {
    return { label: "営業CF", value: data.operatingCF.toLocaleString("ja-JP") };
  }
  if (isFiniteNumber(data.dividendYield)) {
    return { label: "配当利回り", value: formatPercent(data.dividendYield) };
  }
  if (isFiniteNumber(data.per)) {
    return { label: "PER", value: `${formatDecimal(data.per)}倍` };
  }
  if (isFiniteNumber(data.pbr)) {
    return { label: "PBR", value: `${formatDecimal(data.pbr)}倍` };
  }
  if (isFiniteNumber(data.changePercent)) {
    return { label: "当日騰落率", value: formatSignedPercent(data.changePercent) };
  }
  return { label: "確認優先指標", value: "財務更新待ち" };
}

export interface FallbackStockNarrative {
  oneLiner: string;
  summary: string;
  coreKpiLabel: string;
  coreKpiValue: string;
  riskSignal: string;
  collapseCondition: string;
}

export function buildFallbackStockNarrative(
  code: string,
  quote: Quote | undefined,
  fundamental: Fundamentals | undefined
): FallbackStockNarrative {
  const sector = quote?.sector ?? fundamental?.sector ?? "未分類";
  const changePercent = quote?.changePercent;
  const per = quote?.per ?? fundamental?.per;
  const pbr = quote?.pbr ?? fundamental?.pbr;
  const dividendYield = quote?.dividendYield ?? fundamental?.dividendYield;
  const revenueGrowth = fundamental?.revenueGrowth;
  const opGrowth = fundamental?.opGrowth;
  const operatingCF = fundamental?.operatingCF;

  const oneLiner = isFiniteNumber(changePercent)
    ? `${sector}セクターの${code}は${formatSignedPercent(changePercent)}。短期の値動きを観測しながら初期監視します。`
    : `${sector}セクターの${code}。値動きデータは取得待ちのため、まずは財務更新を優先して追跡します。`;

  const valuationSignals: string[] = [];
  if (isFiniteNumber(per)) {
    valuationSignals.push(`PER ${formatDecimal(per)}倍`);
  }
  if (isFiniteNumber(pbr)) {
    valuationSignals.push(`PBR ${formatDecimal(pbr)}倍`);
  }
  if (isFiniteNumber(dividendYield)) {
    valuationSignals.push(`配当利回り ${formatPercent(dividendYield)}`);
  }
  const valuationSummary =
    valuationSignals.length > 0
      ? `バリュエーションは${valuationSignals.join(" / ")}。`
      : "PER・PBR・配当利回りは取得待ちです。";

  const growthSignals: string[] = [];
  if (isFiniteNumber(revenueGrowth)) {
    growthSignals.push(`売上成長率 ${formatSignedPercent(revenueGrowth)}`);
  }
  if (isFiniteNumber(opGrowth)) {
    growthSignals.push(`営業益成長率 ${formatSignedPercent(opGrowth)}`);
  }
  if (isFiniteNumber(operatingCF)) {
    growthSignals.push(`営業CF ${operatingCF.toLocaleString("ja-JP")}`);
  }
  const growthSummary =
    growthSignals.length > 0
      ? `財務では${growthSignals.join(" / ")}を確認できます。`
      : "成長率と営業CFは次回の開示更新を確認してください。";

  const coreKpi = resolveCoreKpiValue({
    changePercent,
    revenueGrowth,
    opGrowth,
    operatingCF,
    dividendYield,
    per,
    pbr
  });

  const riskSignals: string[] = [];
  if (isFiniteNumber(per) && per >= 40) {
    riskSignals.push("PERが高く、決算の下振れ時にバリュエーション調整が出やすい");
  }
  if (isFiniteNumber(pbr) && pbr >= 4) {
    riskSignals.push("PBRが高めで、金利上昇局面の評価圧縮に注意");
  }
  if (isFiniteNumber(changePercent) && Math.abs(changePercent) >= 5) {
    riskSignals.push(`日次変動が${formatSignedPercent(changePercent)}と大きく、短期ボラティリティが高い`);
  }
  if (!isFiniteNumber(revenueGrowth) || !isFiniteNumber(operatingCF)) {
    riskSignals.push("成長率または営業CFが欠けているため、次回決算の補完が必要");
  }
  const riskSignal =
    riskSignals.length > 0 ? `${riskSignals.join("。")}。` : "業績更新と需給の変化をセットで確認してください。";

  const collapseCondition = isFiniteNumber(revenueGrowth) && isFiniteNumber(operatingCF)
    ? "売上成長率がマイナス圏に入り、営業CFも2四半期連続で悪化した場合"
    : isFiniteNumber(revenueGrowth)
      ? "売上成長率が2四半期連続で鈍化した場合"
      : isFiniteNumber(opGrowth)
        ? "営業益成長率がマイナス圏で定着した場合"
        : isFiniteNumber(operatingCF)
          ? "営業CFが2四半期連続でマイナス化した場合"
          : "次回決算でも成長率と営業CFの両方が確認できない場合";

  return {
    oneLiner,
    summary: `${sector}の追加監視銘柄です。${valuationSummary}${growthSummary}`,
    coreKpiLabel: coreKpi.label,
    coreKpiValue: coreKpi.value,
    riskSignal,
    collapseCondition
  };
}

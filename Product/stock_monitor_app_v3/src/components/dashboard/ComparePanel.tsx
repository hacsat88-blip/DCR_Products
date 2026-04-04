import React, { useMemo } from "react";
import clsx from "clsx";

import { formatActionLabel, formatNullableNumber, formatPercent, formatYen } from "@/lib/format";
import { EvaluatedStock } from "@/types/stock";

interface ComparePanelProps {
  stocks: EvaluatedStock[];
  compareSelection: string[];
  onRemove: (code: string) => void;
  onClear: () => void;
  onOpenDetail: (stockId: string) => void;
}

function metricCellTone(
  values: Array<number | null>,
  current: number | null,
  options?: { higherBetter?: boolean }
): string {
  const valid = values.filter((value): value is number => value !== null);
  if (valid.length < 2 || current === null) {
    return "";
  }
  const higherBetter = options?.higherBetter ?? true;
  const adjusted = higherBetter ? valid : valid.map((value) => -value);
  const adjustedCurrent = higherBetter ? current : -current;
  const max = Math.max(...adjusted);
  const min = Math.min(...adjusted);
  if (max === min) {
    return "";
  }
  if (adjustedCurrent === max) {
    return "border border-mint/40 bg-mint/10 text-mint";
  }
  if (adjustedCurrent === min) {
    return "border border-rose-300/40 bg-rose-500/10 text-rose-200";
  }
  return "";
}

function ComparePanelInner({
  stocks,
  compareSelection,
  onRemove,
  onClear,
  onOpenDetail
}: ComparePanelProps): JSX.Element {
  const compared = useMemo(
    () =>
      compareSelection
        .map((code) => stocks.find((stock) => stock.code === code) ?? null)
        .filter((stock): stock is EvaluatedStock => stock !== null)
        .slice(0, 4),
    [stocks, compareSelection]
  );

  const scoreValues = useMemo(() => compared.map((stock) => stock.score), [compared]);
  const revenueValues = useMemo(() => compared.map((stock) => stock.revenueGrowth ?? null), [compared]);
  const opValues = useMemo(() => compared.map((stock) => stock.opGrowth ?? null), [compared]);
  const cfValues = useMemo(() => compared.map((stock) => stock.operatingCF ?? null), [compared]);
  const perValues = useMemo(() => compared.map((stock) => stock.per ?? null), [compared]);
  const pbrValues = useMemo(() => compared.map((stock) => stock.pbr ?? null), [compared]);
  const dividendValues = useMemo(() => compared.map((stock) => stock.dividendYield ?? null), [compared]);

  return (
    <section className="rounded-2xl border border-slate-700/60 bg-panel p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">比較ビュー</h2>
          <p className="text-xs text-slate-400">最大4銘柄を横並びで比較します。</p>
          <p className="mt-1 text-[11px] text-slate-500">緑=相対優位 / 赤=要注意（価格は優劣色を付けません）</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200"
        >
          比較をクリア
        </button>
      </div>

      {compared.length === 0 ? (
        <p className="text-sm text-slate-300">比較対象がありません。ランキングから比較に追加してください。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-xs text-slate-200">
            <thead>
              <tr>
                <th className="border-b border-slate-700 px-2 py-2 text-left text-slate-400">項目</th>
                {compared.map((stock) => (
                  <th key={stock.code} className="border-b border-slate-700 px-2 py-2 text-left">
                    <p className="font-semibold text-slate-100">
                      {stock.code} {stock.name}
                    </p>
                    <div className="mt-1 flex gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenDetail(stock.id)}
                        className="rounded border border-slate-600 px-1.5 py-0.5 text-[11px]"
                      >
                        詳細
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(stock.code)}
                        className="rounded border border-slate-600 px-1.5 py-0.5 text-[11px]"
                      >
                        削除
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-b border-slate-800 px-2 py-2 text-slate-400">株価</td>
                {compared.map((stock) => (
                  <td key={`${stock.code}-price`} className="border-b border-slate-800 px-2 py-2">
                    {formatYen(stock.price)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-b border-slate-800 px-2 py-2 text-slate-400">前日比</td>
                {compared.map((stock) => (
                  <td key={`${stock.code}-change`} className="border-b border-slate-800 px-2 py-2">
                    {formatPercent(stock.changePercent)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-b border-slate-800 px-2 py-2 text-slate-400">本命度</td>
                {compared.map((stock) => (
                  <td
                    key={`${stock.code}-score`}
                    className={clsx(
                      "border-b border-slate-800 px-2 py-2",
                      metricCellTone(scoreValues, stock.score)
                    )}
                  >
                    {stock.score}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-b border-slate-800 px-2 py-2 text-slate-400">判定</td>
                {compared.map((stock) => (
                  <td key={`${stock.code}-action`} className="border-b border-slate-800 px-2 py-2">
                    {formatActionLabel(stock.evaluatedAction)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-b border-slate-800 px-2 py-2 text-slate-400">売上成長</td>
                {compared.map((stock) => (
                  <td
                    key={`${stock.code}-rev`}
                    className={clsx(
                      "border-b border-slate-800 px-2 py-2",
                      metricCellTone(revenueValues, stock.revenueGrowth ?? null)
                    )}
                  >
                    {formatPercent(stock.revenueGrowth)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-b border-slate-800 px-2 py-2 text-slate-400">営業利益成長</td>
                {compared.map((stock) => (
                  <td
                    key={`${stock.code}-op`}
                    className={clsx(
                      "border-b border-slate-800 px-2 py-2",
                      metricCellTone(opValues, stock.opGrowth ?? null)
                    )}
                  >
                    {formatPercent(stock.opGrowth)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-b border-slate-800 px-2 py-2 text-slate-400">営業CF</td>
                {compared.map((stock) => (
                  <td
                    key={`${stock.code}-cf`}
                    className={clsx(
                      "border-b border-slate-800 px-2 py-2",
                      metricCellTone(cfValues, stock.operatingCF ?? null)
                    )}
                  >
                    {stock.operatingCF === null ? "-" : stock.operatingCF.toLocaleString("ja-JP")}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-b border-slate-800 px-2 py-2 text-slate-400">PER</td>
                {compared.map((stock) => (
                  <td
                    key={`${stock.code}-per`}
                    className={clsx(
                      "border-b border-slate-800 px-2 py-2",
                      metricCellTone(perValues, stock.per ?? null, { higherBetter: false })
                    )}
                  >
                    {formatNullableNumber(stock.per)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-b border-slate-800 px-2 py-2 text-slate-400">PBR</td>
                {compared.map((stock) => (
                  <td
                    key={`${stock.code}-pbr`}
                    className={clsx(
                      "border-b border-slate-800 px-2 py-2",
                      metricCellTone(pbrValues, stock.pbr ?? null, { higherBetter: false })
                    )}
                  >
                    {formatNullableNumber(stock.pbr)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-b border-slate-800 px-2 py-2 text-slate-400">配当利回り</td>
                {compared.map((stock) => (
                  <td
                    key={`${stock.code}-div`}
                    className={clsx(
                      "border-b border-slate-800 px-2 py-2",
                      metricCellTone(dividendValues, stock.dividendYield ?? null)
                    )}
                  >
                    {formatPercent(stock.dividendYield)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-b border-slate-800 px-2 py-2 text-slate-400">核心KPI</td>
                {compared.map((stock) => (
                  <td key={`${stock.code}-kpi`} className="border-b border-slate-800 px-2 py-2">
                    {stock.coreKpiLabel}: {stock.coreKpiValue}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-b border-slate-800 px-2 py-2 text-slate-400">危険信号</td>
                {compared.map((stock) => (
                  <td key={`${stock.code}-risk`} className="border-b border-slate-800 px-2 py-2">
                    {stock.riskSignal}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-b border-slate-800 px-2 py-2 text-slate-400">次に見る数字</td>
                {compared.map((stock) => (
                  <td key={`${stock.code}-watch`} className="border-b border-slate-800 px-2 py-2">
                    {stock.coreKpiLabel}: {stock.coreKpiValue}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-b border-slate-800 px-2 py-2 text-slate-400">崩れる条件</td>
                {compared.map((stock) => (
                  <td key={`${stock.code}-collapse`} className="border-b border-slate-800 px-2 py-2">
                    {stock.collapseCondition}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-b border-slate-800 px-2 py-2 text-slate-400">企業説明</td>
                {compared.map((stock) => (
                  <td key={`${stock.code}-narrative`} className="border-b border-slate-800 px-2 py-2">
                    {stock.summary}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-2 py-2 text-slate-400">判定要約</td>
                {compared.map((stock) => (
                  <td key={`${stock.code}-score-summary`} className="px-2 py-2">
                    {stock.scoreSummary}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export const ComparePanel = React.memo(ComparePanelInner);

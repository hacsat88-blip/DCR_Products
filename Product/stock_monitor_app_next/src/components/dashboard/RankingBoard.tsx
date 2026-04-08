import { memo, useMemo } from"react";
import clsx from "clsx";

import { formatActionLabel } from"@/lib/format";
import {
  formatStockChangeDisplay,
  formatStockPriceDisplay,
  getStockDisplayName,
  getStockInsightText,
  isStockPricePending
} from "@/lib/stockPresentation";
import { SrcMetaDots } from "@/components/ui/SrcDot";
import { AlertEvent } from"@/types/alert";
import { RankingSortKey } from"@/types/archive";
import { EvaluatedStock } from"@/types/stock";
import { useStockStore } from"@/store/useStockStore";

interface RankingBoardProps {
 rows: EvaluatedStock[];
 rankingSortKey: RankingSortKey;
 onRankingSortChange: (sortKey: RankingSortKey) => void;
 alertEvents: AlertEvent[];
 compareSelection: string[];
 onAddToCompare: (code: string) => void;
 onRemoveFromCompare: (code: string) => void;
 onOpenDetail: (stockId: string) => void;
 onExportCsv: (rows: EvaluatedStock[]) => void;
}

export const RankingBoard = memo(function RankingBoard({
 rows,
 rankingSortKey,
 onRankingSortChange,
 alertEvents,
 compareSelection,
 onAddToCompare,
 onRemoveFromCompare,
 onOpenDetail,
 onExportCsv
}: RankingBoardProps): JSX.Element {
 const activeAlerts = useMemo(
 () => alertEvents.filter((event) => !event.dismissed),
 [alertEvents]
 );
 const holdingsMap = useStockStore((s) => s.holdingsMap);

 return (
 <section className="card-surface p-5">
 <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
 <div>
 <h2 className="text-base font-semibold tracking-heading text-text-primary">ランキング</h2>
 <p className="mt-0.5 text-xs text-text-muted">現在の絞り込み結果をランキング表示します。</p>
 </div>
 <div className="flex flex-wrap items-center gap-2">
 <select
 value={rankingSortKey}
 onChange={(event) => onRankingSortChange(event.target.value as RankingSortKey)}
 className="rounded-lg border border-border-subtle bg-canvas-deep/80 px-2.5 py-2 text-xs text-text-primary outline-none transition-colors focus:border-border-active"
 >
 <option value="score_desc">本命度（高い順）</option>
 <option value="price_asc">株価（安い順）</option>
 <option value="price_desc">株価（高い順）</option>
 <option value="revenue_growth_desc">売上成長率（高い順）</option>
 <option value="op_growth_desc">営業利益成長率（高い順）</option>
 <option value="operating_cf_desc">営業CF（高い順）</option>
 <option value="per_asc">PER（低い順）</option>
 <option value="backtest_excess_desc">バックテスト超過収益（高い順）</option>
 <option value="action_priority">判定優先順</option>
 </select>
 <button
 type="button"
 onClick={() => onExportCsv(rows)}
 className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-active hover:text-text-primary"
 >
 CSV出力
 </button>
 </div>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full min-w-[1080px] border-collapse text-xs text-text-secondary">
 <thead>
 <tr className="bg-canvas-raised">
 <th className="border-b border-border-subtle px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">順位</th>
 <th className="border-b border-border-subtle px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">銘柄</th>
 <th className="border-b border-border-subtle px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">本命度</th>
 <th className="border-b border-border-subtle px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">判定</th>
  <th className="border-b border-border-subtle px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">価格</th>
  <th className="border-b border-border-subtle px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">前日比</th>
  <th className="border-b border-border-subtle px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">ソース</th>
  <th className="border-b border-border-subtle px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">核心KPI</th>
 <th className="border-b border-border-subtle px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">要約</th>
 <th className="border-b border-border-subtle px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">アラート</th>
 <th className="border-b border-border-subtle px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">監視</th>
 <th className="border-b border-border-subtle px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">保有</th>
 <th className="border-b border-border-subtle px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">操作</th>
 </tr>
 </thead>
 <tbody>
  {rows.map((stock, index) => {
   const selected = compareSelection.includes(stock.code);
   const alertCount = activeAlerts.filter((event) => event.stockCode === stock.code).length;
   const canAddCompare = selected || compareSelection.length < 4;
   const pricePending = isStockPricePending(stock);
   const changePositive = !pricePending && stock.changePercent >= 0;
   const displayName = getStockDisplayName(stock);
   const insightText = getStockInsightText(stock);
   return (
 <tr key={stock.id} className="transition-colors hover:bg-panel-hover">
 <td className="border-b border-border-subtle/50 px-3 py-2.5 font-semibold text-text-primary font-mono tabular-nums">{index + 1}</td>
  <td className="border-b border-border-subtle/50 px-3 py-2.5">
  <p className="font-mono text-[10px] text-text-muted">{stock.code}</p>
  <p className="text-text-primary">{displayName}</p>
  </td>
 <td className="border-b border-border-subtle/50 px-3 py-2.5 font-semibold text-text-primary font-mono tabular-nums">{stock.score}</td>
 <td className="border-b border-border-subtle/50 px-3 py-2.5">{formatActionLabel(stock.evaluatedAction)}</td>
   <td className="border-b border-border-subtle/50 px-3 py-2.5">
   <span className="font-mono tabular-nums text-text-primary">{formatStockPriceDisplay(stock)}</span>
   </td>
  <td className="border-b border-border-subtle/50 px-3 py-2.5">
  <span
   className={clsx(
   "inline-flex min-w-[62px] items-center justify-center rounded-md border px-1.5 py-0.5 font-mono tabular-nums text-[11px] font-semibold",
   pricePending
   ? "border-border-subtle text-text-muted"
   : changePositive
   ? "border-positive/40 bg-positive/10 text-positive"
   : "border-danger/40 bg-danger/10 text-danger"
   )}
   >
   {formatStockChangeDisplay(stock)}
   </span>
   </td>
  <td className="border-b border-border-subtle/50 px-3 py-2.5">
  <SrcMetaDots priceLabel={stock.priceSourceLabel} fundamentalsLabel={stock.fundamentalsSourceLabel} />
  </td>
  <td className="border-b border-border-subtle/50 px-3 py-2.5">
  {stock.coreKpiLabel}: <span className="text-text-primary">{stock.coreKpiValue}</span>
  </td>
  <td className="border-b border-border-subtle/50 px-3 py-2.5 max-w-[280px]">
    <p className="truncate">{insightText}</p>
  </td>
 <td className="border-b border-border-subtle/50 px-3 py-2.5">{alertCount}</td>
 <td className="border-b border-border-subtle/50 px-3 py-2.5">{stock.watched ?"あり" :"なし"}</td>
 <td className="border-b border-border-subtle/50 px-3 py-2.5 font-mono">
 {(holdingsMap[stock.id] ?? 0) > 0
 ? (holdingsMap[stock.id] ?? 0).toLocaleString("ja-JP")
 :"-"}
 </td>
 <td className="border-b border-border-subtle/50 px-3 py-2.5">
 <div className="flex flex-wrap gap-1">
 <button
 type="button"
 onClick={() => onOpenDetail(stock.id)}
 className="rounded-lg border border-border-subtle px-2 py-0.5 text-[11px] text-text-secondary transition-colors hover:border-border-active hover:text-text-primary"
 >
 詳細
 </button>
 {selected ? (
 <button
 type="button"
 onClick={() => onRemoveFromCompare(stock.code)}
 className="rounded-lg border border-border-subtle px-2 py-0.5 text-[11px] text-text-secondary transition-colors hover:border-border-active hover:text-text-primary"
 >
 比較から外す
 </button>
 ) : (
 <button
 type="button"
 disabled={!canAddCompare}
 onClick={() => onAddToCompare(stock.code)}
 className="rounded-lg border border-border-subtle px-2 py-0.5 text-[11px] text-text-secondary transition-colors hover:border-border-active hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
 >
 比較に追加
 </button>
 )}
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </section>
 );
});

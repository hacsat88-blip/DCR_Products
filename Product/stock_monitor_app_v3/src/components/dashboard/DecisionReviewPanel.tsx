import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

import { CHART_COLORS } from "@/components/ui/ChartTheme";
import { formatActionLabel } from "@/lib/format";
import { AlertEvent } from "@/types/alert";
import { BacktestResult } from "@/types/backtest";
import { EvaluatedStock } from "@/types/stock";

interface DecisionReviewPanelProps {
  stock: EvaluatedStock | null;
  alerts: AlertEvent[];
  backtestResult: BacktestResult | null;
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("ja-JP");
}

export function DecisionReviewPanel({
  stock,
  alerts,
  backtestResult
}: DecisionReviewPanelProps): JSX.Element {
  if (!stock) {
    return (
      <section className="card-surface p-5">
        <h2 className="text-lg font-semibold text-slate-100">判定レビュー</h2>
        <p className="mt-3 text-sm text-slate-300">対象銘柄がありません。</p>
      </section>
    );
  }

  const recentAlerts = alerts
    .filter((alert) => !alert.dismissed && alert.stockCode === stock.code)
    .sort((a, b) => Date.parse(b.triggeredAt) - Date.parse(a.triggeredAt))
    .slice(0, 3);

  const latestActionChange = backtestResult?.actionChanges ?? null;
  const sameActionPerformance = (() => {
    if (!backtestResult || !stock) {
      return null;
    }
    const points = backtestResult.points ?? [];
    if (points.length < 2) {
      return null;
    }
    const returns: number[] = [];
    for (let i = 0; i < points.length - 1; i += 1) {
      const current = points[i];
      const next = points[i + 1];
      if (current.action !== stock.evaluatedAction) {
        continue;
      }
      if (
        typeof current.strategyIndex !== "number" ||
        typeof next.strategyIndex !== "number" ||
        current.strategyIndex === 0
      ) {
        continue;
      }
      returns.push(((next.strategyIndex - current.strategyIndex) / current.strategyIndex) * 100);
    }
    if (returns.length === 0) {
      return null;
    }
    const avg = returns.reduce((sum, value) => sum + value, 0) / returns.length;
    return { samples: returns.length, averageNextReturnPct: avg };
  })();

  return (
    <section className="card-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">判定レビュー</h2>
        <p className="text-xs text-slate-400">{stock.code} {stock.name}</p>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-200">
          <p className="text-slate-400">現在判定</p>
          <p className="mt-1 font-semibold">{formatActionLabel(stock.evaluatedAction)}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-200">
          <p className="text-slate-400">本命度</p>
          <p className="mt-1 font-semibold">{stock.score}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-200">
          <p className="text-slate-400">直近の判定変化</p>
          <p className="mt-1 font-semibold">{latestActionChange === null ? "未実行" : latestActionChange}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-200">
          <p className="text-slate-400">次回決算注目</p>
          <p className="mt-1 font-semibold">{stock.coreKpiLabel}</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-300">企業説明: {stock.summary}</p>
      <p className="mt-1 text-sm text-slate-300">判定要約: {stock.scoreSummary}</p>
      {backtestResult === null ? (
        <p className="mt-2 text-xs text-amber">この銘柄のバックテストは未実行です。</p>
      ) : null}
      {sameActionPerformance ? (
        <p className="mt-1 text-xs text-slate-300">
          同判定の過去簡易実績: {sameActionPerformance.samples} サンプル / 次期平均{" "}
          {sameActionPerformance.averageNextReturnPct > 0 ? "+" : ""}
          {sameActionPerformance.averageNextReturnPct.toFixed(2)}%
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-500">同判定の過去実績は十分なサンプルがありません。</p>
      )}

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
          <p className="text-xs font-semibold text-slate-100">本命度内訳（上位）</p>
          {(() => {
            const breakdown = stock.breakdown.slice(0, 5);
            return (
              <ResponsiveContainer width="100%" height={Math.min(breakdown.length * 32, 160)}>
                <BarChart layout="vertical" data={breakdown} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 10, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {breakdown.map((item) => (
                      <Cell key={item.id} fill={item.value > 0 ? CHART_COLORS.mint : CHART_COLORS.danger} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            );
          })()}
          <ul className="mt-2 space-y-1 text-xs text-slate-400">
            {stock.breakdown.slice(0, 5).map((item) => (
              <li key={item.id}>{item.reason}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
          <p className="text-xs font-semibold text-slate-100">最近のアラート</p>
          <ul className="mt-2 space-y-2 text-xs text-slate-200">
            {recentAlerts.length === 0 ? <li className="text-slate-500">該当なし</li> : null}
            {recentAlerts.map((alert) => (
              <li key={alert.id}>
                <p className="font-semibold">{alert.title}</p>
                <p className="text-slate-400">{formatDateTime(alert.triggeredAt)}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-200">
        <p className="font-semibold">崩れる条件</p>
        <p className="mt-1 text-slate-300">{stock.collapseCondition}</p>
      </div>
    </section>
  );
}

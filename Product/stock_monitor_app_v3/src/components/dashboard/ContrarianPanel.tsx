import { CHART_COLORS } from "@/components/ui/ChartTheme";
import { EvaluatedStock } from "@/types/stock";

interface ContrarianPanelProps {
  stock: EvaluatedStock | null;
}

type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

function getRiskLevel(stock: EvaluatedStock): RiskLevel {
  if (stock.operatingCF !== null && stock.operatingCF < 0) return "HIGH";
  if (stock.per !== null && stock.per > 40) return "HIGH";
  if (stock.hasDilutionRisk || stock.hasOneOffProfitRisk) return "MEDIUM";
  return "LOW";
}

function riskColor(level: RiskLevel): string {
  if (level === "HIGH") return CHART_COLORS.danger;
  if (level === "MEDIUM") return CHART_COLORS.amber;
  return CHART_COLORS.mint;
}

function riskLabel(level: RiskLevel): string {
  if (level === "HIGH") return "HIGH";
  if (level === "MEDIUM") return "MEDIUM";
  return "LOW";
}

function WarningIcon({ color }: { color: string }): JSX.Element {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2L1 18h18L10 2z" stroke={color} strokeWidth={1.5} fill="none" />
      <line x1={10} y1={8} x2={10} y2={12} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={10} cy={15} r={0.8} fill={color} />
    </svg>
  );
}

function buildContrarianPoint(stock: EvaluatedStock): string {
  if (stock.evaluatedAction === "buy_now" && stock.per !== null && stock.per > 35) {
    return "成長は強い一方でPERが高く、期待先行で調整が深くなるリスクがあります。";
  }
  if (stock.operatingCF !== null && stock.operatingCF < 0) {
    return "売上や利益が伸びても、営業CFがマイナスなら質の劣化が先に出る可能性があります。";
  }
  if (stock.hasDilutionRisk) {
    return "希薄化リスクがあるため、業績改善がEPSに十分反映されないシナリオを想定すべきです。";
  }
  if (stock.hasOneOffProfitRisk) {
    return "一過性利益の寄与が大きい場合、次回決算で反動減になるシナリオに注意が必要です。";
  }
  if (stock.evaluatedAction === "exclude") {
    return "現在は除外でも、営業CF正転や成長率回復で判定が改善する反転シナリオは残ります。";
  }
  return "現状判定に明確な逆風は少ないですが、次回決算で核心KPIが未達なら評価は急変し得ます。";
}

export function ContrarianPanel({ stock }: ContrarianPanelProps): JSX.Element {
  const risk = stock ? getRiskLevel(stock) : null;
  const color = risk ? riskColor(risk) : CHART_COLORS.axis;

  return (
    <section className="card-surface p-5">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-text-primary font-orb">逆張り監査官</h2>
        <p className="text-xs text-slate-400">現在判断に対する反対意見を1つ提示して、思い込みを減らします。</p>
      </div>
      {!stock || !risk ? (
        <p className="text-sm text-slate-300">銘柄を選択すると反対意見を表示します。</p>
      ) : (
        <div
          className="relative overflow-hidden rounded-none border border-border-subtle bg-canvas-deep/50 p-4 text-sm leading-7 text-slate-200"
          style={{ borderLeftWidth: 3, borderLeftColor: color }}
        >
          <div className="flex items-center gap-2">
            <WarningIcon color={color} />
            <p className="text-xs text-text-muted">
              対象: {stock.code} {stock.name}
            </p>
            <span
              className="ml-auto rounded-none px-2.5 py-0.5 text-[10px] font-bold tracking-wider"
              style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}
            >
              {riskLabel(risk)}
            </span>
          </div>
          <p className="mt-2">{buildContrarianPoint(stock)}</p>
        </div>
      )}
    </section>
  );
}

interface TradeRef {
  symbol: string;
  pnl: number;
  timestamp: string;
}

interface Report {
  date: string;
  total_pnl: number;
  trade_count: number;
  wins: number;
  losses: number;
  win_rate: number;
  max_drawdown: number;
  best_trade: TradeRef | null;
  worst_trade: TradeRef | null;
}

interface Props {
  report: Report | null;
}

export default function DailyReportSummary({ report }: Props) {
  if (!report) return null;

  const stats = [
    { label: "合計P/L", value: report.total_pnl, color: report.total_pnl >= 0 ? "text-green-400" : "text-red-400", prefix: true, isNumber: true },
    { label: "勝率", value: `${(report.win_rate * 100).toFixed(0)}%`, sub: `(${report.wins}勝 ${report.losses}敗)`, isNumber: false },
    { label: "取引回数", value: `${report.trade_count}回`, isNumber: false },
    { label: "最大DD", value: `¥${Math.round(report.max_drawdown).toLocaleString()}`, color: "text-red-400", isNumber: false },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-gray-800/50 rounded-lg p-2.5 border border-gray-800">
          <div className="text-[10px] text-gray-500 uppercase">{s.label}</div>
          <div className={`text-lg font-bold font-mono ${s.color || "text-gray-200"}`}>
            {s.isNumber && s.prefix && typeof s.value === "number" ? (s.value >= 0 ? "+" : "") : ""}
            {s.isNumber && typeof s.value === "number" && s.prefix ? `¥${Math.round(s.value).toLocaleString()}` : s.value}
          </div>
          {s.sub && <div className="text-[10px] text-gray-500">{s.sub}</div>}
        </div>
      ))}

      {(report.best_trade || report.worst_trade) && (
        <div className="col-span-2 grid grid-cols-2 gap-2">
          {report.best_trade && (
            <div className="bg-green-900/20 border border-green-800/50 rounded p-2">
              <div className="text-[10px] text-gray-500">ベスト</div>
              <div className="text-sm font-bold">
                {report.best_trade.symbol}{" "}
                <span className="text-green-400">+¥{Math.round(report.best_trade.pnl).toLocaleString()}</span>
              </div>
            </div>
          )}
          {report.worst_trade && (
            <div className="bg-red-900/20 border border-red-800/50 rounded p-2">
              <div className="text-[10px] text-gray-500">ワースト</div>
              <div className="text-sm font-bold">
                {report.worst_trade.symbol}{" "}
                <span className="text-red-400">¥{Math.round(report.worst_trade.pnl).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

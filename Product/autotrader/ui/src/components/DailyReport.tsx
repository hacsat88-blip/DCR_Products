"use client";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

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
  cumulative: { timestamp: string; cumulative_pnl: number }[];
}

export default function DailyReport() {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    const fetchReport = () =>
      fetch("/api/daily-report")
        .then((r) => r.json())
        .then(setReport)
        .catch(() => {});
    fetchReport();
    const id = setInterval(fetchReport, 15000);
    return () => clearInterval(id);
  }, []);

  if (!report) return null;

  const chartData = report.cumulative.map((c) => ({
    time: c.timestamp.slice(11, 16),
    pnl: Math.round(c.cumulative_pnl),
  }));

  return (
    <div className="bg-gray-900 rounded-xl p-4 mb-4">
      <h2 className="text-sm text-gray-400 mb-3">日次レポート — {report.date}</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400">合計P/L</div>
          <div
            className={`text-xl font-bold ${
              report.total_pnl >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {report.total_pnl >= 0 ? "+" : ""}¥{Math.round(report.total_pnl).toLocaleString()}
          </div>
        </div>
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400">勝率</div>
          <div className="text-xl font-bold">
            {(report.win_rate * 100).toFixed(0)}%
            <span className="text-xs text-gray-500 ml-1">
              ({report.wins}勝 {report.losses}敗)
            </span>
          </div>
        </div>
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400">取引回数</div>
          <div className="text-xl font-bold">{report.trade_count}回</div>
        </div>
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400">最大DD</div>
          <div className="text-xl font-bold text-red-400">
            ¥{Math.round(report.max_drawdown).toLocaleString()}
          </div>
        </div>
      </div>

      {chartData.length > 1 && (
        <div className="h-40 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 10 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "#1f2937", border: "1px solid #374151", fontSize: 12 }}
                labelStyle={{ color: "#9ca3af" }}
              />
              <ReferenceLine y={0} stroke="#4b5563" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="pnl"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={false}
                animationDuration={300}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {(report.best_trade || report.worst_trade) && (
        <div className="grid grid-cols-2 gap-3 text-xs">
          {report.best_trade && (
            <div className="bg-green-900/30 border border-green-800 rounded p-2">
              <div className="text-gray-400">ベスト</div>
              <div className="font-bold">
                {report.best_trade.symbol}{" "}
                <span className="text-green-400">
                  +¥{Math.round(report.best_trade.pnl).toLocaleString()}
                </span>
              </div>
            </div>
          )}
          {report.worst_trade && (
            <div className="bg-red-900/30 border border-red-800 rounded p-2">
              <div className="text-gray-400">ワースト</div>
              <div className="font-bold">
                {report.worst_trade.symbol}{" "}
                <span className="text-red-400">
                  ¥{Math.round(report.worst_trade.pnl).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

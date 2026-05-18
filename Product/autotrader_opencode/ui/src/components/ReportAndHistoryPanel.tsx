"use client";
import { useEffect, useState } from "react";
import PanelCard from "./ui/PanelCard";
import DailyReportSummary from "./DailyReportSummary";
import MiniCumulativeChart from "./MiniCumulativeChart";
import TradeHistoryTable from "./TradeHistoryTable";

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

const MOCK_REPORT: Report = {
  date: "2025-01-15",
  total_pnl: 8500,
  trade_count: 6,
  wins: 3,
  losses: 1,
  win_rate: 0.75,
  max_drawdown: 2000,
  best_trade: { symbol: "7203", pnl: 5000, timestamp: "2025-01-15T10:15:00" },
  worst_trade: { symbol: "6758", pnl: -2000, timestamp: "2025-01-15T10:30:00" },
  cumulative: [
    { timestamp: "2025-01-15T09:30:00", cumulative_pnl: 0 },
    { timestamp: "2025-01-15T10:15:00", cumulative_pnl: 5000 },
    { timestamp: "2025-01-15T10:30:00", cumulative_pnl: 3000 },
    { timestamp: "2025-01-15T11:00:00", cumulative_pnl: 6500 },
    { timestamp: "2025-01-15T13:00:00", cumulative_pnl: 6500 },
  ],
};

export default function ReportAndHistoryPanel() {
  // null = 未ロード（初回のみモック）、APIエラー時はnullに戻してモックではなく空表示
  const [report, setReport] = useState<Report | null>(null);
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    const fetchReport = () =>
      fetch("/api/daily-report")
        .then((r) => r.json())
        .then((d) => {
          setReport(d);
          setApiReady(true);
        })
        .catch(() => {
          if (apiReady) setReport(null);
        });
    fetchReport();
    const id = setInterval(fetchReport, 15000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // バックエンド未接続時のみモックを表示
  const displayReport = apiReady ? report : (report ?? MOCK_REPORT);

  const chartData = displayReport?.cumulative.map((c) => ({
    time: c.timestamp.slice(11, 16),
    pnl: Math.round(c.cumulative_pnl),
  })) ?? [];

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto">
      <PanelCard title="日次レポート" accentColor="blue">
        <DailyReportSummary report={displayReport ?? null} />
        <MiniCumulativeChart data={chartData} />
      </PanelCard>

      <PanelCard title="トレード履歴" accentColor="gray" className="flex-1 min-h-0">
        <TradeHistoryTable />
      </PanelCard>
    </div>
  );
}

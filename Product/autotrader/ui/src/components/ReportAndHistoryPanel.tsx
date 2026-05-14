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

export default function ReportAndHistoryPanel() {
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

  const chartData = report?.cumulative.map((c) => ({
    time: c.timestamp.slice(11, 16),
    pnl: Math.round(c.cumulative_pnl),
  })) ?? [];

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto">
      <PanelCard title="日次レポート" accentColor="blue">
        <DailyReportSummary report={report} />
        <MiniCumulativeChart data={chartData} />
      </PanelCard>

      <PanelCard title="トレード履歴" accentColor="gray" className="flex-1 min-h-0">
        <TradeHistoryTable />
      </PanelCard>
    </div>
  );
}

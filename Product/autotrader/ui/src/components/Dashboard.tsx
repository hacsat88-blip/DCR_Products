"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { useStatusPolling } from "../hooks/useStatusPolling";
import HeaderStatusBar from "./HeaderStatusBar";
import SignalLogPanel, { TradeLog } from "./SignalLogPanel";
import ChartAndPositionPanel from "./ChartAndPositionPanel";
import ReportAndHistoryPanel from "./ReportAndHistoryPanel";
import { unlockAudio, handleEvent } from "../lib/alerts";

const MOCK_LOGS: TradeLog[] = [
  { timestamp: "2025-01-15T09:30:00", symbol: "7203", action: "buy", reason: "RSI30割れ+出来高2倍", confidence: 0.85, price: 2450 },
  { timestamp: "2025-01-15T09:45:00", symbol: "6758", action: "buy", reason: "トレンド転換確認", confidence: 0.78, price: 12500 },
  { timestamp: "2025-01-15T10:15:00", symbol: "7203", action: "sell", reason: "利益確定（+¥5,000）", confidence: 0.92, price: 2500 },
  { timestamp: "2025-01-15T10:30:00", symbol: "9984", action: "buy", reason: "押し目買いシグナル", confidence: 0.81, price: 67800 },
  { timestamp: "2025-01-15T11:00:00", symbol: "6758", action: "sell", reason: "損切り（-¥2,000）", confidence: 0.88, price: 12300 },
  { timestamp: "2025-01-15T11:30:00", symbol: "9984", action: "sell", reason: "利益確定（+¥3,500）", confidence: 0.90, price: 68200 },
  { timestamp: "2025-01-15T13:00:00", symbol: "7203", action: "buy", reason: "午後の反発パターン", confidence: 0.75, price: 2470 },
  { timestamp: "2025-01-15T13:30:00", symbol: "8306", action: "buy", reason: "金融株シナリオ", confidence: 0.82, price: 580 },
];

const MOCK_PRICES: Record<string, number> = {
  "7203": 2480,
  "6758": 12600,
  "9984": 68150,
  "8306": 585,
};

export default function Dashboard() {
  const [logs, setLogs] = useState<TradeLog[]>(MOCK_LOGS);
  const [livePrices, setLivePrices] = useState<Record<string, number>>(MOCK_PRICES);
  const prevStateRef = useRef({ stopped: false, pnl: 0 });
  const status = useStatusPolling(5000);
  const { lastMessage: wsData } = useWebSocket("ws://localhost:8000/ws");

  // WebSocketデータ処理
  useEffect(() => {
    if (!wsData) return;
    handleEvent(wsData, prevStateRef.current);

    if (wsData.symbol && wsData.price) {
      setLivePrices((prev) => ({ ...prev, [wsData.symbol!]: wsData.price! }));
    }

    if (wsData.action && wsData.action !== "hold") {
      setLogs((prev) =>
        [
          {
            timestamp: wsData.timestamp ?? new Date().toISOString(),
            symbol: wsData.symbol!,
            action: wsData.action,
            reason: wsData.reason ?? "",
            confidence: wsData.confidence ?? 0,
            price: wsData.price ?? 0,
          },
          ...prev,
        ].slice(0, 100),
      );
    }

    if (wsData.daily_pnl !== undefined) {
      prevStateRef.current.pnl = wsData.daily_pnl;
    }
    if (wsData.trading_stopped !== undefined) {
      prevStateRef.current.stopped = wsData.trading_stopped;
    }
  }, [wsData]);

  const chartLogs = useMemo(
    () =>
      logs.map((l) => ({ symbol: l.symbol, timestamp: l.timestamp, action: l.action, price: l.price })),
    [logs],
  );

  const toggleSimulation = async () => {
    const next = status?.simulation_mode ? "off" : "on";
    await fetch(`/api/simulation/${next}`, { method: "POST" });
    // statusはポーリングで更新される
  };

  const emergencyStop = async () => {
    if (!confirm("取引を緊急停止しますか？")) return;
    await fetch("/api/simulation/on", { method: "POST" });
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0B0F17] text-white font-sans" onClick={unlockAudio}>
      <HeaderStatusBar
        status={status}
        onToggleSimulation={toggleSimulation}
        onEmergencyStop={emergencyStop}
      />

      <div className="flex-1 flex h-[calc(100vh-64px)] overflow-hidden">
        {/* 左カラム */}
        <aside className="w-[280px] flex-none flex flex-col overflow-hidden border-r border-gray-800/50 p-4 hidden lg:block">
          <SignalLogPanel logs={logs} />
        </aside>

        {/* 中央カラム */}
        <main className="flex-1 min-w-0 overflow-y-auto p-4">
          <ChartAndPositionPanel logs={chartLogs} livePrices={livePrices} />
        </main>

        {/* 右カラム */}
        <aside className="w-[380px] flex-none overflow-y-auto border-l border-gray-800/50 p-4 hidden xl:block">
          <ReportAndHistoryPanel />
        </aside>
      </div>
    </div>
  );
}

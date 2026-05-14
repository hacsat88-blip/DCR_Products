"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { useStatusPolling } from "../hooks/useStatusPolling";
import HeaderStatusBar from "./HeaderStatusBar";
import SignalLogPanel, { TradeLog } from "./SignalLogPanel";
import ChartAndPositionPanel from "./ChartAndPositionPanel";
import ReportAndHistoryPanel from "./ReportAndHistoryPanel";
import { unlockAudio, handleEvent } from "../lib/alerts";

export default function Dashboard() {
  const [logs, setLogs] = useState<TradeLog[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
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
        <aside className="w-[280px] flex-none overflow-y-auto border-r border-gray-800/50 p-4 hidden lg:block">
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

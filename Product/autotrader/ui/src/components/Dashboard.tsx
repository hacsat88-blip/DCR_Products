"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import PriceChart from "./PriceChart";
import PositionPanel from "./PositionPanel";
import TradeHistory from "./TradeHistory";
import DailyReport from "./DailyReport";
import { handleEvent, unlockAudio } from "../lib/alerts";

interface TradeLog {
  timestamp: string;
  symbol: string;
  action: string;
  reason: string;
  confidence: number;
  price: number;
}

interface StatusData {
  daily_pnl: number;
  positions: number;
  trading_stopped: boolean;
  stop_reason: string;
  risk_budget: number;
  simulation_mode: boolean;
  tier?: string;
}

export default function Dashboard() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [logs, setLogs] = useState<TradeLog[]>([]);
  const [chartSymbol, setChartSymbol] = useState<string>("");
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const prevStateRef = useRef({ stopped: false, pnl: 0 });

  useEffect(() => {
    const fetchStatus = () =>
      fetch("/api/status")
        .then((r) => r.json())
        .then(setStatus)
        .catch(() => {});
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);

    wsRef.current = new WebSocket("ws://localhost:8000/ws");
    wsRef.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      handleEvent(data, prevStateRef.current);

      if (data.symbol && data.price) {
        setLivePrices((prev) => ({ ...prev, [data.symbol]: data.price }));
        if (!chartSymbol) setChartSymbol(data.symbol);
      }
      if (data.action && data.action !== "hold") {
        setLogs((prev) =>
          [
            {
              timestamp: data.timestamp,
              symbol: data.symbol,
              action: data.action,
              reason: data.reason ?? "",
              confidence: data.confidence ?? 0,
              price: data.price ?? 0,
            },
            ...prev,
          ].slice(0, 50),
        );
      }
      if (data.daily_pnl !== undefined) {
        setStatus((prev) =>
          prev ? { ...prev, daily_pnl: data.daily_pnl, risk_budget: data.risk_budget } : prev,
        );
        prevStateRef.current.pnl = data.daily_pnl;
      }
      if (data.trading_stopped !== undefined) {
        prevStateRef.current.stopped = data.trading_stopped;
      }
    };

    return () => {
      clearInterval(interval);
      wsRef.current?.close();
    };
  }, [chartSymbol]);

  const emergencyStop = async () => {
    if (!confirm("取引を緊急停止しますか？")) return;
    await fetch("/api/simulation/on", { method: "POST" });
    setStatus((prev) => (prev ? { ...prev, simulation_mode: true } : prev));
  };

  const toggleSimulation = async () => {
    const next = status?.simulation_mode ? "off" : "on";
    await fetch(`/api/simulation/${next}`, { method: "POST" });
    setStatus((prev) => (prev ? { ...prev, simulation_mode: next === "on" } : prev));
  };

  const pnl = status?.daily_pnl ?? 0;
  const budget = status?.risk_budget ?? -3000;
  const riskUsed = Math.min(100, Math.max(0, ((-3000 - budget) / 3000) * 100));

  const symbols = Array.from(new Set(logs.map((l) => l.symbol)));

  const chartSignals = useMemo(
    () =>
      logs
        .filter((l) => l.symbol === chartSymbol)
        .map((l) => ({ timestamp: l.timestamp, action: l.action, price: l.price })),
    [chartSymbol, logs],
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 font-mono" onClick={unlockAudio}>
      <div className="flex items-center justify-between mb-4 bg-gray-900 rounded-xl p-4">
        <div>
          <span className="text-gray-400 text-sm">本日P/L</span>
          <div className={`text-3xl font-bold ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
            {pnl >= 0 ? "+" : ""}¥{pnl.toLocaleString()}
          </div>
        </div>
        <div className="text-center">
          <span className="text-gray-400 text-sm">ティア</span>
          <div className="text-xl font-bold text-blue-400">{status?.tier ?? "—"}</div>
        </div>
        <div className="text-center">
          <span className="text-gray-400 text-sm">ポジション</span>
          <div className="text-xl font-bold">{status?.positions ?? 0} / 2</div>
        </div>
        <div className="flex gap-2">
          {status?.simulation_mode && (
            <span className="bg-yellow-700 text-yellow-200 px-3 py-1 rounded-full text-xs">
              シミュレーション中
            </span>
          )}
          {status?.trading_stopped && (
            <span className="bg-red-700 text-red-200 px-3 py-1 rounded-full text-xs animate-pulse">
              取引停止: {status.stop_reason}
            </span>
          )}
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl p-4 mb-4">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>リスク使用量</span>
          <span>残余予算: ¥{Math.abs(budget).toLocaleString()}</span>
        </div>
        <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              riskUsed > 80 ? "bg-red-500" : riskUsed > 50 ? "bg-yellow-500" : "bg-green-500"
            }`}
            style={{ width: `${riskUsed}%` }}
          />
        </div>
        <div className="text-right text-xs text-gray-500 mt-1">
          {riskUsed.toFixed(0)}% / 上限 ¥3,000
        </div>
      </div>

      <PositionPanel livePrices={livePrices} />

      {symbols.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-2 mb-4 flex gap-2 overflow-x-auto">
          {symbols.map((s) => (
            <button
              key={s}
              onClick={() => setChartSymbol(s)}
              className={`px-3 py-1 rounded text-xs ${
                chartSymbol === s
                  ? "bg-blue-700 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {chartSymbol && (
        <PriceChart symbol={chartSymbol} signals={chartSignals} />
      )}

      <DailyReport />

      <div className="bg-gray-900 rounded-xl p-4 mb-4">
        <h2 className="text-sm text-gray-400 mb-3">AI判断ログ（リアルタイム）</h2>
        {logs.length === 0 ? (
          <div className="text-gray-600 text-sm">判断待機中...</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className="flex items-center gap-3 text-sm border-b border-gray-800 pb-2">
                <span className="text-gray-500 text-xs w-14 shrink-0">
                  {log.timestamp.slice(11, 16)}
                </span>
                <span className="font-bold w-16 shrink-0">{log.symbol}</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold w-10 text-center shrink-0 ${
                    log.action === "buy"
                      ? "bg-green-800 text-green-300"
                      : "bg-red-800 text-red-300"
                  }`}
                >
                  {log.action === "buy" ? "買" : "売"}
                </span>
                <span className="text-gray-300 flex-1 truncate">{log.reason}</span>
                <span className="text-gray-500 text-xs shrink-0">
                  確信度 {(log.confidence * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <TradeHistory />

      <div className="flex gap-3 sticky bottom-4">
        <button
          onClick={toggleSimulation}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            status?.simulation_mode
              ? "bg-green-700 hover:bg-green-600 text-white"
              : "bg-yellow-700 hover:bg-yellow-600 text-white"
          }`}
        >
          {status?.simulation_mode ? "本番モードに切替" : "シミュレーションに戻す"}
        </button>
        <button
          onClick={emergencyStop}
          className="px-4 py-2 bg-red-800 hover:bg-red-700 rounded-lg text-sm font-bold text-white transition-colors shadow-lg shadow-red-900/50"
        >
          緊急停止
        </button>
      </div>
    </div>
  );
}

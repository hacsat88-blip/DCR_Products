import RiskBar from "./ui/RiskBar";

interface StatusData {
  daily_pnl: number;
  positions: number;
  trading_stopped: boolean;
  stop_reason: string;
  risk_budget: number;
  simulation_mode: boolean;
  tier?: string;
}

interface Props {
  status: StatusData | null;
  onToggleSimulation: () => void;
  onEmergencyStop: () => void;
}

export default function HeaderStatusBar({ status, onToggleSimulation, onEmergencyStop }: Props) {
  const pnl = status?.daily_pnl ?? 0;

  return (
    <header className="flex-none h-16 bg-gray-900/80 backdrop-blur border-b border-gray-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-8">
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">本日 P/L</div>
          <div className={`text-2xl font-mono font-bold ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
            {pnl >= 0 ? "+" : ""}¥{pnl.toLocaleString()}
          </div>
        </div>

        <div className="w-px h-8 bg-gray-800" />

        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">ティア</div>
          <div className="text-lg font-bold text-blue-400">{status?.tier ?? "—"}</div>
        </div>

        <div className="w-px h-8 bg-gray-800" />

        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">ポジション</div>
          <div className="text-lg font-bold font-mono">{status?.positions ?? 0} / 2</div>
        </div>

        <div className="w-px h-8 bg-gray-800" />

        <div className="w-48">
          <RiskBar budget={status?.risk_budget ?? -3000} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {status?.simulation_mode && (
          <span className="bg-yellow-900/50 text-yellow-300 border border-yellow-700/50 px-2 py-1 rounded text-xs font-mono">
            SIMULATION
          </span>
        )}
        {status?.trading_stopped && (
          <span className="bg-red-900/50 text-red-300 border border-red-700/50 px-2 py-1 rounded text-xs font-mono animate-pulse">
            STOP: {status.stop_reason}
          </span>
        )}

        <button
          onClick={onToggleSimulation}
          className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
            status?.simulation_mode
              ? "bg-green-800 hover:bg-green-700 text-white"
              : "bg-yellow-800 hover:bg-yellow-700 text-white"
          }`}
        >
          {status?.simulation_mode ? "本番モード" : "シミュレーション"}
        </button>

        <button
          onClick={onEmergencyStop}
          className="px-3 py-1.5 bg-red-900 hover:bg-red-800 border border-red-700 rounded text-xs font-bold text-white transition-colors"
        >
          緊急停止
        </button>
      </div>
    </header>
  );
}

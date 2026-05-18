import PanelCard from "./ui/PanelCard";

export interface TradeLog {
  timestamp: string;
  symbol: string;
  risk_state: "GREEN" | "YELLOW" | "RED";
  should_stop_new_entries: boolean;
  should_reduce_size: boolean;
  reason: string;
  rule_issue: string;
  improvement: string;
  api_error?: boolean;
}

interface Props {
  logs: TradeLog[];
}

export default function SignalLogPanel({ logs }: Props) {
  return (
    <PanelCard title="Codex助言 / リスク警告" accentColor="blue" className="h-full flex flex-col">
      <div className="space-y-2 flex-1 overflow-y-auto pr-1 min-h-0">
        {logs.length === 0 ? (
          <div className="text-gray-600 text-sm">助言待機中...</div>
        ) : (
          logs.map((log, i) => (
            <div
              key={i}
              className="space-y-1 text-sm border-b border-gray-800/50 pb-2 animate-in fade-in slide-in-from-top-1 duration-300"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-[10px] w-10 shrink-0 font-mono">
                  {log.timestamp.slice(11, 16)}
                </span>
                <span className="font-bold w-14 shrink-0">{log.symbol}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold w-14 text-center shrink-0 ${
                    log.risk_state === "GREEN"
                      ? "bg-green-900/60 text-green-300 border border-green-800/50"
                      : log.risk_state === "YELLOW"
                        ? "bg-yellow-900/60 text-yellow-300 border border-yellow-800/50"
                        : "bg-red-900/60 text-red-300 border border-red-800/50"
                  }`}
                >
                  {log.risk_state}
                </span>
                <span className="text-gray-300 flex-1 truncate text-xs">{log.reason}</span>
              </div>
              <div className="pl-[120px] text-[11px] text-gray-500 leading-snug">
                <div className="truncate">弱点: {log.rule_issue || "なし"}</div>
                <div className="truncate">改善: {log.improvement || "記録を継続"}</div>
                <div className="flex gap-2 pt-1">
                  {log.should_stop_new_entries && <span className="text-red-300">新規停止推奨</span>}
                  {log.should_reduce_size && <span className="text-yellow-300">サイズ縮小推奨</span>}
                  {log.api_error && <span className="text-red-300">APIエラー</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </PanelCard>
  );
}

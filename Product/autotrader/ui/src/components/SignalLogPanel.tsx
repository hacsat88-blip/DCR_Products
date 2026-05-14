import PanelCard from "./ui/PanelCard";

export interface TradeLog {
  timestamp: string;
  symbol: string;
  action: string;
  reason: string;
  confidence: number;
  price: number;
}

interface Props {
  logs: TradeLog[];
}

export default function SignalLogPanel({ logs }: Props) {
  return (
    <PanelCard title="AI 判断ログ" accentColor="blue" className="h-full">
      <div className="space-y-2 max-h-full overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <div className="text-gray-600 text-sm">判断待機中...</div>
        ) : (
          logs.map((log, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm border-b border-gray-800/50 pb-2 animate-in fade-in slide-in-from-top-1 duration-300"
            >
              <span className="text-gray-500 text-[10px] w-10 shrink-0 font-mono">
                {log.timestamp.slice(11, 16)}
              </span>
              <span className="font-bold w-14 shrink-0">{log.symbol}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold w-8 text-center shrink-0 ${
                  log.action === "buy"
                    ? "bg-green-900/60 text-green-300 border border-green-800/50"
                    : "bg-red-900/60 text-red-300 border border-red-800/50"
                }`}
              >
                {log.action === "buy" ? "買" : "売"}
              </span>
              <span className="text-gray-300 flex-1 truncate text-xs">{log.reason}</span>
              <span className="text-gray-500 text-[10px] shrink-0 font-mono">
                {(log.confidence * 100).toFixed(0)}%
              </span>
            </div>
          ))
        )}
      </div>
    </PanelCard>
  );
}

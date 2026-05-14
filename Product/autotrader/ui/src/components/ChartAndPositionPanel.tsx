"use client";
import { useState } from "react";
import PanelCard from "./ui/PanelCard";
import PriceChart from "./PriceChart";
import ActivePositionCard from "./ActivePositionCard";

interface Props {
  logs: { symbol: string; timestamp: string; action: string; price: number }[];
  livePrices: Record<string, number>;
}

export default function ChartAndPositionPanel({ logs, livePrices }: Props) {
  const symbols = Array.from(new Set(logs.map((l) => l.symbol)));
  const [chartSymbol, setChartSymbol] = useState(symbols[0] ?? "");

  const chartSignals = logs
    .filter((l) => l.symbol === chartSymbol)
    .map((l) => ({ timestamp: l.timestamp, action: l.action, price: l.price }));

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto">
      <PanelCard title="価格チャート" accentColor="blue">
        {symbols.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {symbols.map((s) => (
              <button
                key={s}
                onClick={() => setChartSymbol(s)}
                className={`px-2.5 py-1 rounded-full text-xs font-mono transition-colors ${
                  chartSymbol === s
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {chartSymbol ? (
          <PriceChart symbol={chartSymbol} signals={chartSignals} />
        ) : (
          <div className="text-gray-600 text-sm h-40 flex items-center justify-center">
            データ待機中...
          </div>
        )}
      </PanelCard>

      <PanelCard title="アクティブポジション" accentColor="green">
        <ActivePositionCard livePrices={livePrices} />
      </PanelCard>
    </div>
  );
}

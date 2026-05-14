"use client";
import { useEffect, useState } from "react";

interface Position {
  symbol: string;
  entry_price: number;
  lot: number;
  open_time: string | null;
  elapsed_minutes: number;
  remaining_minutes: number;
}

interface Props {
  livePrices: Record<string, number>;
}

export default function PositionPanel({ livePrices }: Props) {
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    const fetchPositions = () =>
      fetch("/api/positions")
        .then((r) => r.json())
        .then((d) => setPositions(d.positions ?? []))
        .catch(() => {});
    fetchPositions();
    const id = setInterval(fetchPositions, 3000);
    return () => clearInterval(id);
  }, []);

  if (positions.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-4 mb-4">
        <h2 className="text-sm text-gray-400 mb-2">アクティブポジション</h2>
        <div className="text-gray-600 text-sm">ポジションなし</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-4 mb-4">
      <h2 className="text-sm text-gray-400 mb-3">アクティブポジション</h2>
      <div className="space-y-3">
        {positions.map((p) => {
          const current = livePrices[p.symbol] ?? p.entry_price;
          const unrealized = (current - p.entry_price) * p.lot;
          const remainingPct = (p.remaining_minutes / 60) * 100;
          return (
            <div key={p.symbol} className="bg-gray-800 rounded p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-lg">{p.symbol}</span>
                <span
                  className={`text-xl font-bold ${
                    unrealized >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {unrealized >= 0 ? "+" : ""}¥{Math.round(unrealized).toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-3 text-xs text-gray-400 gap-2 mb-2">
                <div>
                  エントリー
                  <div className="text-gray-200">¥{p.entry_price.toLocaleString()}</div>
                </div>
                <div>
                  現在値
                  <div className="text-gray-200">¥{current.toLocaleString()}</div>
                </div>
                <div>
                  株数
                  <div className="text-gray-200">{p.lot}株</div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>保有 {p.elapsed_minutes.toFixed(1)}分</span>
                <span>強制決済まで {Math.max(0, p.remaining_minutes).toFixed(1)}分</span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    remainingPct < 20 ? "bg-red-500" : remainingPct < 50 ? "bg-yellow-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${remainingPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

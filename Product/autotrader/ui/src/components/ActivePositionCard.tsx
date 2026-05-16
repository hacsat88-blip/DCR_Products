"use client";
import { useEffect, useState } from "react";
import ProgressCircle from "./ui/ProgressCircle";

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

const MOCK_POSITIONS: Position[] = [
  { symbol: "8306", entry_price: 580, lot: 100, open_time: "2025-01-15T13:00:00", elapsed_minutes: 32, remaining_minutes: 28 },
  { symbol: "7203", entry_price: 2470, lot: 50, open_time: "2025-01-15T13:15:00", elapsed_minutes: 17, remaining_minutes: 43 },
];

export default function ActivePositionCard({ livePrices }: Props) {
  // null = ロード中（初回のみモック表示）、[] = ロード済みでポジションなし
  const [positions, setPositions] = useState<Position[] | null>(null);

  useEffect(() => {
    const fetchPositions = () =>
      fetch("/api/positions")
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d.positions)) setPositions(d.positions);
        })
        .catch(() => {});
    fetchPositions();
    const id = setInterval(fetchPositions, 3000);
    return () => clearInterval(id);
  }, []);

  // バックエンド未接続時のみモックを表示（開発/シミュレーション確認用）
  const displayPositions = positions ?? MOCK_POSITIONS;

  if (displayPositions.length === 0) {
    return (
      <div className="text-gray-600 text-sm">ポジションなし</div>
    );
  }

  return (
    <div className="space-y-3">
      {displayPositions.map((p) => {
        const current = livePrices[p.symbol] ?? p.entry_price;
        const unrealized = (current - p.entry_price) * p.lot;
        const remainingPct = Math.max(0, (p.remaining_minutes / 60) * 100);
        const isProfit = unrealized >= 0;

        return (
          <div key={p.symbol} className="bg-gray-800/50 rounded-lg p-3 border border-gray-800">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-lg">{p.symbol}</span>
              <div className="flex items-center gap-2">
                <ProgressCircle
                  percentage={remainingPct}
                  color={remainingPct < 20 ? "#EF4444" : remainingPct < 50 ? "#F59E0B" : "#3B82F6"}
                  size={28}
                />
                <span className={`text-lg font-bold font-mono ${isProfit ? "text-green-400" : "text-red-400"}`}>
                  {isProfit ? "+" : ""}¥{Math.round(unrealized).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 text-xs text-gray-400 gap-2 mb-2">
              <div>
                <div className="text-[10px] text-gray-500">エントリー</div>
                <div className="text-gray-200 font-mono">¥{p.entry_price.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500">現在値</div>
                <div className="text-gray-200 font-mono">¥{current.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500">株数</div>
                <div className="text-gray-200 font-mono">{p.lot}株</div>
              </div>
            </div>

            <div className="flex justify-between text-[10px] text-gray-500">
              <span>保有 {p.elapsed_minutes.toFixed(1)}分</span>
              <span>強制決済まで {Math.max(0, p.remaining_minutes).toFixed(1)}分</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

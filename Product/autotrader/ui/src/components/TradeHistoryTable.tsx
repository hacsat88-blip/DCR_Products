"use client";
import { useEffect, useMemo, useState } from "react";

interface Trade {
  id: number;
  symbol: string;
  action: string;
  price: number;
  qty: number;
  pnl: number;
  timestamp: string;
  session_date: string;
}

type SortKey = "timestamp" | "symbol" | "pnl";

const MOCK_TRADES: Trade[] = [
  { id: 1, symbol: "7203", action: "buy", price: 2450, qty: 100, pnl: 0, timestamp: "2025-01-15T09:30:00", session_date: "2025-01-15" },
  { id: 2, symbol: "7203", action: "sell", price: 2500, qty: 100, pnl: 5000, timestamp: "2025-01-15T10:15:00", session_date: "2025-01-15" },
  { id: 3, symbol: "6758", action: "buy", price: 12500, qty: 20, pnl: 0, timestamp: "2025-01-15T09:45:00", session_date: "2025-01-15" },
  { id: 4, symbol: "6758", action: "sell", price: 12300, qty: 20, pnl: -2000, timestamp: "2025-01-15T10:30:00", session_date: "2025-01-15" },
  { id: 5, symbol: "9984", action: "buy", price: 67800, qty: 5, pnl: 0, timestamp: "2025-01-15T10:00:00", session_date: "2025-01-15" },
  { id: 6, symbol: "9984", action: "sell", price: 68200, qty: 5, pnl: 3500, timestamp: "2025-01-15T11:00:00", session_date: "2025-01-15" },
  { id: 7, symbol: "8306", action: "buy", price: 580, qty: 200, pnl: 0, timestamp: "2025-01-15T13:00:00", session_date: "2025-01-15" },
];

export default function TradeHistoryTable() {
  const [trades, setTrades] = useState<Trade[]>(MOCK_TRADES);
  const [filterSymbol, setFilterSymbol] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  useEffect(() => {
    const fetchTrades = () =>
      fetch(`/api/trades?limit=500${filterSymbol ? `&symbol=${filterSymbol}` : ""}`)
        .then((r) => r.json())
        .then((d) => setTrades(d.trades ?? MOCK_TRADES))
        .catch(() => {});
    fetchTrades();
    const id = setInterval(fetchTrades, 10000);
    return () => clearInterval(id);
  }, [filterSymbol]);

  const sorted = useMemo(() => {
    const arr = [...trades];
    arr.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDesc ? -cmp : cmp;
    });
    return arr;
  }, [trades, sortKey, sortDesc]);

  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const maxPage = Math.max(0, Math.ceil(sorted.length / pageSize) - 1);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc(!sortDesc);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  const arrow = (key: SortKey) => (sortKey === key ? (sortDesc ? " ↓" : " ↑") : "");

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm text-gray-400">トレード履歴（永続）</h2>
        <input
          type="text"
          placeholder="銘柄コードで絞り込み"
          value={filterSymbol}
          onChange={(e) => {
            setFilterSymbol(e.target.value);
            setPage(0);
          }}
          className="bg-gray-800 text-gray-200 text-xs px-2 py-1 rounded border border-gray-700"
        />
      </div>
      {sorted.length === 0 ? (
        <div className="text-gray-600 text-sm">履歴なし</div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="text-gray-500 border-b border-gray-800 sticky top-0 bg-[#0B0F17]">
                <tr>
                  <th className="py-2 text-left cursor-pointer" onClick={() => toggleSort("timestamp")}>
                    時刻{arrow("timestamp")}
                  </th>
                  <th className="py-2 text-left cursor-pointer" onClick={() => toggleSort("symbol")}>
                    銘柄{arrow("symbol")}
                  </th>
                  <th className="py-2 text-left">売買</th>
                  <th className="py-2 text-right">価格</th>
                  <th className="py-2 text-right">株数</th>
                  <th className="py-2 text-right cursor-pointer" onClick={() => toggleSort("pnl")}>
                    損益{arrow("pnl")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.map((t) => (
                  <tr key={t.id} className="border-b border-gray-800/50">
                    <td className="py-1.5 text-gray-400">{t.timestamp.slice(5, 16).replace("T", " ")}</td>
                    <td className="py-1.5 font-bold">{t.symbol}</td>
                    <td className="py-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          t.action === "buy" ? "bg-green-800 text-green-300" : "bg-red-800 text-red-300"
                        }`}
                      >
                        {t.action === "buy" ? "買" : "売"}
                      </span>
                    </td>
                    <td className="py-1.5 text-right">¥{t.price.toLocaleString()}</td>
                    <td className="py-1.5 text-right">{t.qty}</td>
                    <td
                      className={`py-1.5 text-right font-bold ${
                        t.pnl > 0 ? "text-green-400" : t.pnl < 0 ? "text-red-400" : "text-gray-500"
                      }`}
                    >
                      {t.pnl !== 0 ? `${t.pnl > 0 ? "+" : ""}¥${Math.round(t.pnl).toLocaleString()}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-3 text-xs text-gray-500 pt-2 border-t border-gray-800">
            <span>
              {page * pageSize + 1}〜{Math.min((page + 1) * pageSize, sorted.length)} / {sorted.length}件
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-2 py-1 bg-gray-800 rounded disabled:opacity-40"
              >
                前
              </button>
              <button
                onClick={() => setPage(Math.min(maxPage, page + 1))}
                disabled={page >= maxPage}
                className="px-2 py-1 bg-gray-800 rounded disabled:opacity-40"
              >
                次
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

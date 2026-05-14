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

export default function TradeHistory() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filterSymbol, setFilterSymbol] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  useEffect(() => {
    const fetchTrades = () =>
      fetch(`/api/trades?limit=500${filterSymbol ? `&symbol=${filterSymbol}` : ""}`)
        .then((r) => r.json())
        .then((d) => setTrades(d.trades ?? []))
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
    <div className="bg-gray-900 rounded-xl p-4 mb-4">
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
          <table className="w-full text-xs">
            <thead className="text-gray-500 border-b border-gray-800">
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
          <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
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

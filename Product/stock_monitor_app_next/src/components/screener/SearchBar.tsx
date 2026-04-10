"use client";

import clsx from "clsx";
import { useMemo, useRef, useState } from "react";

import { formatActionLabel, formatPercent, formatYen } from "@/lib/format";
import { getCompareSelectionStatus } from "@/lib/stockPresentation";
import { stockSearchService, StockSearchResult } from "@/services/stockSearchService";
import { useStockStore } from "@/store/useStockStore";
import { EvaluatedStock } from "@/types/stock";

type SearchMode = "registered" | "api";

interface SearchBarProps {
  value: string;
  registeredStocks: EvaluatedStock[];
  onChange: (value: string) => void;
  onRegister: (payload: {
    code: string;
    name: string;
    sector: string | null;
    oneLiner: string;
    summary: string;
  }) => Promise<{ ok: boolean; reason?: string }>;
}

interface CacheEntry {
  expiresAt: number;
  payload: {
    results: StockSearchResult[];
    error: string | null;
  };
}

const SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function SearchBar({ value, registeredStocks, onChange, onRegister }: SearchBarProps): JSX.Element {
  const [mode, setMode] = useState<SearchMode>("registered");
  const [selectedCode, setSelectedCode] = useState("");
  const [apiQuery, setApiQuery] = useState("");
  const [apiResults, setApiResults] = useState<StockSearchResult[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isRegisteringCode, setIsRegisteringCode] = useState<string | null>(null);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [searchedAt, setSearchedAt] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const compareSelection = useStockStore((s) => s.compareSelection);

  const sortedRegistered = useMemo(
    () => [...registeredStocks].sort((a, b) => a.code.localeCompare(b.code)),
    [registeredStocks]
  );
  const registeredCodeSet = useMemo(
    () => new Set(sortedRegistered.map((stock) => stock.code)),
    [sortedRegistered]
  );
  const registeredByCode = useMemo(
    () => new Map(sortedRegistered.map((stock) => [stock.code, stock])),
    [sortedRegistered]
  );
  const apiResultMeta = useMemo(() => {
    const registeredCount = apiResults.filter((item) => item.isRegistered || registeredCodeSet.has(item.code)).length;
    return {
      total: apiResults.length,
      registeredCount,
      newCount: apiResults.length - registeredCount
    };
  }, [apiResults, registeredCodeSet]);
  const compareStatus = useMemo(() => getCompareSelectionStatus(compareSelection), [compareSelection]);

  const handleApiSearch = async (): Promise<void> => {
    const query = apiQuery.trim();
    if (query.length < 2) {
      setApiError("検索文字数は2文字以上で入力してください。");
      setApiResults([]);
      return;
    }

    const cacheKey = query.toLowerCase();
    const now = Date.now();
    const cached = cacheRef.current.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      setApiResults(cached.payload.results);
      setApiError(cached.payload.error);
      setSearchedAt(new Date().toISOString());
      return;
    }

      setIsSearching(true);
    try {
      const payload = await stockSearchService.search(query, {
        registeredCodes: sortedRegistered.map((stock) => stock.code),
      });
      setApiResults(payload.results);
      setApiError(payload.error);
      const entry: CacheEntry = {
        expiresAt: now + SEARCH_CACHE_TTL_MS,
        payload
      };
      cacheRef.current.set(cacheKey, entry);
      setSearchedAt(new Date().toISOString());
    } catch (error) {
      setApiResults([]);
      setApiError(error instanceof Error ? error.message : "市場検索に失敗しました。");
      setSearchedAt(new Date().toISOString());
    } finally {
      setIsSearching(false);
    }
  };

  const formatSearchedAt = (iso: string | null): string => {
    if (!iso) {
      return "-";
    }
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
      return "-";
    }
    return parsed.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <section className="rounded-lg border border-border-subtle bg-panel p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor="stock-search" className="block text-xs font-semibold tracking-[0.14em] text-text-secondary">
          銘柄検索
        </label>
        <div className="flex items-center gap-1 rounded-lg border border-border-subtle bg-canvas-deep/60 p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("registered")}
            className={clsx(
              "rounded-lg px-2 py-1",
              mode === "registered" ? "bg-secondary/20 text-secondary" : "text-text-secondary"
            )}
          >
            登録銘柄
          </button>
          <button
            type="button"
            onClick={() => setMode("api")}
            className={clsx("rounded-lg px-2 py-1", mode === "api" ? "bg-secondary/20 text-secondary" : "text-text-secondary")}
          >
            Web検索
          </button>
        </div>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
        <span className="rounded-lg border border-border-subtle px-2 py-0.5 text-text-secondary">
          比較 {compareStatus.count}/{compareStatus.limit}
        </span>
        <span className="rounded-lg border border-border-subtle px-2 py-0.5 text-text-muted">
          残り {compareStatus.slotsLeft}枠
        </span>
        {compareStatus.isFull ? (
          <span className="rounded-lg border border-amber/35 bg-amber/10 px-2 py-0.5 text-amber">
            比較上限に到達
          </span>
        ) : null}
      </div>

      {mode === "registered" ? (
        <div className="grid gap-2">
          <input
            id="stock-search"
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="銘柄名 / コード / キーワード"
            className="w-full rounded-lg border border-primary/30 bg-canvas px-3 py-3 text-sm text-text-primary outline-none ring-secondary focus:border-primary"
          />
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <select
              value={selectedCode}
              onChange={(event) => setSelectedCode(event.target.value)}
              className="rounded-lg border border-border-subtle bg-canvas/90 px-3 py-2 text-sm text-text-primary outline-none"
            >
              <option value="">登録銘柄を選択して絞り込む</option>
              {sortedRegistered.map((stock) => (
                <option key={stock.id} value={stock.code}>
                  {stock.code} {stock.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onChange(selectedCode)}
              disabled={!selectedCode}
              className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-primary disabled:opacity-50"
            >
              適用
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <input
              type="text"
              value={apiQuery}
              onChange={(event) => setApiQuery(event.target.value)}
              placeholder="銘柄名 / 4桁コード（例: いちご / 2337）"
              className="w-full rounded-lg border border-primary/30 bg-canvas px-3 py-3 text-sm text-text-primary outline-none ring-secondary focus:border-primary"
            />
            <button
              type="button"
              onClick={() => void handleApiSearch()}
              disabled={isSearching}
              className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-primary disabled:opacity-50"
            >
              {isSearching ? "検索中..." : "市場検索"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <p>最終検索: {formatSearchedAt(searchedAt)} / Yahoo Finance優先・ローカル検索fallback</p>
            {apiResultMeta.total > 0 ? (
              <>
                <span className="rounded-lg border border-border-subtle px-2 py-0.5 text-[11px] text-text-secondary">
                  結果 {apiResultMeta.total}件
                </span>
                <span className="rounded-lg border border-border-subtle px-2 py-0.5 text-[11px] text-text-secondary">
                  登録済み {apiResultMeta.registeredCount}件
                </span>
                {apiResultMeta.newCount > 0 ? (
                  <span className="rounded-lg border border-secondary/40 bg-secondary/10 px-2 py-0.5 text-[11px] text-secondary">
                    新規候補 {apiResultMeta.newCount}件
                  </span>
                ) : null}
              </>
            ) : null}
          </div>

          {apiError ? <p className="rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber">{apiError}</p> : null}

          <div className="grid gap-2">
            {apiResults.length === 0 ? (
              <p className="rounded-lg border border-border-subtle bg-canvas-deep/50 px-3 py-2 text-xs text-text-muted">
                検索結果はここに表示されます。
              </p>
            ) : (
              apiResults.map((item) => (
                <div key={`${item.code}-${item.source}`} className="rounded-lg border border-border-subtle bg-canvas-deep/60 px-3 py-2 text-xs">
                  {(() => {
                      const alreadyRegistered = item.isRegistered || registeredCodeSet.has(item.code);
                      const matchedRegistered = registeredByCode.get(item.code);
                     const livePrice =
                       typeof matchedRegistered?.price === "number" && Number.isFinite(matchedRegistered.price)
                         ? matchedRegistered.price
                         : null;
                     const liveChange =
                       typeof matchedRegistered?.changePercent === "number" && Number.isFinite(matchedRegistered.changePercent)
                         ? matchedRegistered.changePercent
                         : null;
                     return (
                       <>
                   <div className="flex flex-wrap items-center justify-between gap-2">
                     <p className="font-semibold text-text-primary">
                       {item.code} {item.name}
                    </p>
                    <div className="flex items-center gap-1">
                       <span className="rounded-lg border border-border-subtle px-2 py-0.5 text-[11px] text-text-secondary">
                         {alreadyRegistered
                           ? "登録済み"
                           : item.source === "web"
                             ? "WEB"
                             : item.source === "claude"
                               ? "CLAUDE"
                               : item.source === "catalog"
                                 ? "CATALOG"
                                 : "登録済み"}
                       </span>
                      {!alreadyRegistered ? (
                        <span className="rounded-lg border border-amber/50 bg-amber/10 px-2 py-0.5 text-[11px] text-amber">未登録</span>
                       ) : null}
                     </div>
                   </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="rounded-lg border border-border-subtle px-2 py-0.5 text-text-secondary">
                        {item.sector ?? "業種未設定"}
                      </span>
                      <span className="rounded-lg border border-border-subtle px-2 py-0.5 text-text-secondary">
                        {livePrice === null ? "現在値 - " : `現在値 ${formatYen(livePrice)}`}
                      </span>
                     <span
                       className={clsx(
                         "rounded-lg border px-2 py-0.5",
                         liveChange === null
                           ? "border-border-subtle text-text-muted"
                           : liveChange >= 0
                             ? "border-positive/40 bg-positive/10 text-positive"
                             : "border-danger/40 bg-danger/10 text-danger"
                       )}
                     >
                        {liveChange === null ? "前日比データなし" : `前日比 ${formatPercent(liveChange)}`}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-text-secondary">
                      {item.oneLiner || item.summary}
                    </p>
                    {alreadyRegistered ? (
                      <div className="mt-2 rounded-lg border border-positive/25 bg-positive/8 px-3 py-2 text-[11px] text-text-secondary">
                        <p className="font-medium text-positive">この銘柄は既に一覧・ランキングに登録済みです。</p>
                        {matchedRegistered ? (
                          <p className="mt-1 text-text-secondary">
                            現在の判定: <span className="text-text-primary">{formatActionLabel(matchedRegistered.evaluatedAction)}</span>
                            {" / "}
                            本命度 <span className="font-mono tabular-nums text-text-primary">{matchedRegistered.score}</span>
                          </p>
                        ) : (
                          <p className="mt-1 text-text-secondary">「一覧で絞り込む」で既存カードをすぐ確認できます。</p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 rounded-lg border border-secondary/30 bg-secondary/8 px-3 py-2 text-[11px] text-text-secondary">
                        「銘柄一覧へ登録」を押すと、この候補が一覧・ランキング・比較パネルに追加されます。
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <button
                       type="button"
                      onClick={() => {
                        onChange(item.code);
                        setMode("registered");
                        setSelectedCode(item.code);
                       }}
                       className="rounded-lg border border-border-subtle px-2 py-1 text-[11px] text-text-primary"
                     >
                       {alreadyRegistered ? "一覧で絞り込む" : "コードを検索欄へ反映"}
                     </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setRegisterMessage(null);
                        setIsRegisteringCode(item.code);
                        const result = await onRegister({
                          code: item.code,
                          name: item.name,
                          sector: item.sector,
                          oneLiner: item.oneLiner,
                          summary: item.summary
                        });
                        setIsRegisteringCode(null);
                        if (!result.ok) {
                          setRegisterMessage(
                            result.reason === "invalid_code"
                              ? "4桁コードのみ登録できます。"
                              : "銘柄登録に失敗しました。"
                          );
                          return;
                        }
                        setRegisterMessage(`${item.code} ${item.name} を銘柄一覧へ登録しました。`);
                        onChange(item.code);
                        setMode("registered");
                        setSelectedCode(item.code);
                      }}
                      disabled={alreadyRegistered || isRegisteringCode === item.code}
                      className="rounded-lg border border-secondary/40 bg-secondary/10 px-2 py-1 text-[11px] text-secondary disabled:opacity-50"
                    >
                      {alreadyRegistered
                        ? "登録済み"
                        : isRegisteringCode === item.code
                          ? "登録中..."
                          : "銘柄一覧へ登録"}
                    </button>
                  </div>
                      </>
                    );
                  })()}
                </div>
              ))
            )}
          </div>
          {registerMessage ? <p className="text-[11px] text-positive">{registerMessage}</p> : null}
          <p className="text-[11px] text-text-muted">未登録銘柄は「銘柄一覧へ登録」で登録すると、一覧・ランキング・判断系パネルに連携されます。</p>
        </div>
      )}
    </section>
  );
}

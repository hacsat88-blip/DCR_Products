import { useState } from "react";

import { RankingSortKey, SavedScreen } from "@/types/archive";
import { SortKey, StockFilters } from "@/types/stock";

interface SavedScreenPanelProps {
  filters: StockFilters;
  sortKey: SortKey;
  rankingSortKey: RankingSortKey;
  compareCount: number;
  savedScreens: SavedScreen[];
  onSave: (name: string) => void;
  onUpdate: (
    screenId: string,
    patch: Partial<Pick<SavedScreen, "name">>
  ) => { ok: boolean; reason?: string };
  onDelete: (screenId: string) => void;
  onApply: (screenId: string) => void;
}

function summarizeFilters(
  filters: StockFilters,
  sortKey: SortKey,
  rankingSortKey: RankingSortKey,
  compareCount: number
): string {
  const parts: string[] = [];
  if (filters.query) parts.push(`検索:${filters.query}`);
  if (filters.sector !== "all") parts.push(`業態:${filters.sector}`);
  if (filters.action !== "all") parts.push(`判定:${filters.action}`);
  if (filters.priceMax !== null) parts.push(`株価<=${filters.priceMax}`);
  if (filters.revenueGrowthMin !== null) parts.push(`売上成長>=${filters.revenueGrowthMin}`);
  if (filters.opGrowthMin !== null) parts.push(`営業利益成長>=${filters.opGrowthMin}`);
  parts.push(`並び替え:${sortKey}`);
  parts.push(`ランキング:${rankingSortKey}`);
  parts.push(`比較:${compareCount}`);
  return parts.join(" / ");
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("ja-JP");
}

export function SavedScreenPanel({
  filters,
  sortKey,
  rankingSortKey,
  compareCount,
  savedScreens,
  onSave,
  onUpdate,
  onDelete,
  onApply
}: SavedScreenPanelProps): JSX.Element {
  const [name, setName] = useState("");

  const currentSummary = summarizeFilters(filters, sortKey, rankingSortKey, compareCount);

  return (
    <section className="rounded-none border border-border-subtle bg-panel p-5 shadow-card">
      <div className="mb-3">
        <h2 className="text-lg font-semibold font-orb text-text-primary">保存スクリーン</h2>
        <p className="text-xs text-text-muted">現在の絞り込み条件を保存して再利用します。</p>
      </div>

      <div className="rounded-none border border-border-subtle bg-canvas-deep/60 p-3 text-xs text-text-primary">
        <p className="text-text-muted">現在の条件</p>
        <p className="mt-1">{currentSummary}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="例: buy_now候補"
          className="min-w-[220px] rounded-none border border-border-subtle bg-canvas/90 px-3 py-2 text-xs text-text-primary outline-none"
        />
        <button
          type="button"
          onClick={() => {
            onSave(name);
            setName("");
          }}
          className="rounded-none border border-blue/40 bg-blue/10 px-3 py-2 text-xs font-semibold text-blue"
        >
          保存 / 上書き
        </button>
      </div>

      <div className="mt-3 grid gap-2">
        {savedScreens.length === 0 ? (
          <p className="text-sm text-text-secondary">保存済みスクリーンはありません。</p>
        ) : (
          savedScreens.map((screen) => (
            <article key={screen.id} className="rounded-none border border-border-subtle bg-canvas-deep/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-text-primary">{screen.name}</p>
                <p className="text-[11px] text-text-muted">{formatDateTime(screen.updatedAt)}</p>
              </div>
              <p className="mt-1 text-xs text-text-muted">
                並び替え: {screen.sortKey} / ランキング: {screen.rankingSortKey ?? "score_desc"} / 比較数:{" "}
                {screen.compareSelection?.length ?? 0} / フィルタ項目数: {Object.keys(screen.filters).length}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onApply(screen.id)}
                  className="rounded-none border border-border-subtle px-2 py-1 text-[11px] text-text-primary"
                >
                  適用
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = window.prompt("新しい保存名", screen.name);
                    if (next === null) {
                      return;
                    }
                    const trimmed = next.trim();
                    if (!trimmed) {
                      window.alert("保存名を確認してください");
                      return;
                    }
                    const result = onUpdate(screen.id, { name: trimmed });
                    if (!result.ok) {
                      if (result.reason === "duplicate_name") {
                        window.alert("同名の保存済みスクリーンがあります");
                      } else {
                        window.alert("保存名を確認してください");
                      }
                    }
                  }}
                  className="rounded-none border border-border-subtle px-2 py-1 text-[11px] text-text-primary"
                >
                  名前変更
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(screen.id)}
                  className="rounded-none border border-border-subtle px-2 py-1 text-[11px] text-text-primary"
                >
                  削除
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

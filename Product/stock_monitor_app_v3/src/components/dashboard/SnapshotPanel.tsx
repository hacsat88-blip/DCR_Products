import React, { useMemo, useState } from "react";

import { StockSnapshot } from "@/types/archive";

interface SnapshotPanelProps {
  snapshots: StockSnapshot[];
  autosaveSnapshots: boolean;
  onSave: () => void;
  onToggleAutosave: (enabled: boolean) => void;
  onDeleteCapture: (captureId: string) => void;
  onClear: () => void;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("ja-JP");
}

const SNAPSHOT_PAGE_SIZE = 20;

function SnapshotPanelInner({
  snapshots,
  autosaveSnapshots,
  onSave,
  onToggleAutosave,
  onDeleteCapture,
  onClear
}: SnapshotPanelProps): JSX.Element {
  const [visibleCount, setVisibleCount] = useState(SNAPSHOT_PAGE_SIZE);

  const captures = useMemo(() => {
    const captureMap = new Map<
      string,
      { captureId: string; checkedAt: string; source: "manual" | "autosave"; count: number }
    >();
    for (const snapshot of snapshots) {
      const source = snapshot.captureSource ?? "manual";
      const current = captureMap.get(snapshot.captureId);
      if (!current) {
        captureMap.set(snapshot.captureId, {
          captureId: snapshot.captureId,
          checkedAt: snapshot.checkedAt,
          source,
          count: 1
        });
        continue;
      }
      current.count += 1;
      if (Date.parse(snapshot.checkedAt) > Date.parse(current.checkedAt)) {
        current.checkedAt = snapshot.checkedAt;
      }
    }
    return [...captureMap.values()].sort(
      (a, b) => Date.parse(b.checkedAt) - Date.parse(a.checkedAt)
    );
  }, [snapshots]);

  const latest = captures[0]?.checkedAt ?? null;
  const visibleCaptures = captures.slice(0, visibleCount);
  const hasMore = visibleCount < captures.length;

  return (
    <section className="rounded-none border border-border-subtle bg-panel p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold font-orb text-text-primary">スナップショット履歴</h2>
          <p className="text-xs text-text-muted">評価状態を保存し、後から比較できます。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            className="rounded-none border border-blue/40 bg-blue/10 px-3 py-2 text-xs font-semibold text-blue"
          >
            スナップショット保存
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-none border border-border-subtle px-3 py-2 text-xs font-semibold text-slate-200"
          >
            全削除
          </button>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <div className="rounded-none border border-border-subtle bg-canvas-deep/60 p-3 text-xs text-slate-200">
          <p className="text-text-muted">保存件数 (capture)</p>
          <p className="mt-1 text-base font-semibold font-mono-tech">{captures.length}</p>
        </div>
        <div className="rounded-none border border-border-subtle bg-canvas-deep/60 p-3 text-xs text-slate-200">
          <p className="text-text-muted">最新保存</p>
          <p className="mt-1 font-semibold font-mono-tech">{formatDateTime(latest)}</p>
        </div>
        <label className="rounded-none border border-border-subtle bg-canvas-deep/60 p-3 text-xs text-slate-200">
          <p className="text-text-muted">自動保存</p>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={autosaveSnapshots}
              onChange={(event) => onToggleAutosave(event.target.checked)}
            />
            <span>{autosaveSnapshots ? "有効" : "無効"}</span>
          </div>
        </label>
      </div>

      <div className="mt-3 rounded-none border border-border-subtle bg-canvas-deep/50 p-3">
        <p className="text-xs font-semibold text-text-primary">最近の保存</p>
        {visibleCaptures.length === 0 ? (
          <p className="mt-2 text-xs text-text-muted">まだ履歴がありません。</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {visibleCaptures.map((snapshot) => (
              <li
                key={snapshot.captureId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-none border border-border-subtle bg-canvas/90 px-3 py-2 text-xs"
              >
                <div className="text-slate-200">
                  <p className="font-semibold">保存ID {snapshot.captureId.slice(0, 12)}</p>
                  <p className="text-text-muted">
                    {formatDateTime(snapshot.checkedAt)} / 種別 {snapshot.source === "manual" ? "手動" : "自動"} / 銘柄 {snapshot.count} 件
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteCapture(snapshot.captureId)}
                  className="rounded-none border border-border-subtle px-2 py-1 text-[11px] text-slate-200"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
        {hasMore && (
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + SNAPSHOT_PAGE_SIZE)}
            className="mt-2 w-full rounded-none border border-border-subtle py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-400"
          >
            もっと見る（残り {captures.length - visibleCount} 件）
          </button>
        )}
      </div>
    </section>
  );
}

export const SnapshotPanel = React.memo(SnapshotPanelInner);

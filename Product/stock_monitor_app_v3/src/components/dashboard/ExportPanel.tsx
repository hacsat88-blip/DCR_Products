import { useState } from "react";

interface ExportSelection {
  snapshots: boolean;
  alertEvents: boolean;
  savedScreens: boolean;
  backtestResults: boolean;
  holdings: boolean;
}

interface ExportPreview {
  snapshotCount: number;
  alertEventCount: number;
  savedScreenCount: number;
  backtestResultCount: number;
  holdingsCount: number;
}

interface ExportPanelProps {
  onExportJson: (selection: Partial<ExportSelection>) => void;
  onExportSnapshotsCsv: () => void;
  onExportRankingCsv: () => void;
  onExportPortfolioCsv: () => void;
  preview: ExportPreview;
}

export function ExportPanel({
  onExportJson,
  onExportSnapshotsCsv,
  onExportRankingCsv,
  onExportPortfolioCsv,
  preview
}: ExportPanelProps): JSX.Element {
  const [selection, setSelection] = useState<ExportSelection>({
    snapshots: true,
    alertEvents: true,
    savedScreens: true,
    backtestResults: true,
    holdings: false
  });

  const previewParts: string[] = [];
  if (selection.snapshots && preview.snapshotCount > 0) {
    previewParts.push(`スナップショット: ${preview.snapshotCount}件`);
  }
  if (selection.alertEvents && preview.alertEventCount > 0) {
    previewParts.push(`アラート: ${preview.alertEventCount}件`);
  }
  if (selection.savedScreens && preview.savedScreenCount > 0) {
    previewParts.push(`スクリーン: ${preview.savedScreenCount}件`);
  }
  if (selection.backtestResults && preview.backtestResultCount > 0) {
    previewParts.push(`バックテスト: ${preview.backtestResultCount}件`);
  }
  if (selection.holdings && preview.holdingsCount > 0) {
    previewParts.push(`保有: ${preview.holdingsCount}銘柄`);
  }

  return (
    <section className="rounded-none border border-border-subtle bg-panel p-5 shadow-card">
      <div className="mb-3">
        <h2 className="text-lg font-semibold font-orb text-text-primary">エクスポート</h2>
        <p className="text-xs text-text-muted">保存データを JSON / CSV で出力します。</p>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <label className="rounded-none border border-border-subtle bg-canvas-deep/60 px-3 py-2 text-xs text-text-primary">
          <input
            type="checkbox"
            checked={selection.snapshots}
            onChange={(event) => setSelection((prev) => ({ ...prev, snapshots: event.target.checked }))}
            className="mr-2"
          />
          スナップショット
        </label>
        <label className="rounded-none border border-border-subtle bg-canvas-deep/60 px-3 py-2 text-xs text-text-primary">
          <input
            type="checkbox"
            checked={selection.alertEvents}
            onChange={(event) => setSelection((prev) => ({ ...prev, alertEvents: event.target.checked }))}
            className="mr-2"
          />
          アラート履歴
        </label>
        <label className="rounded-none border border-border-subtle bg-canvas-deep/60 px-3 py-2 text-xs text-text-primary">
          <input
            type="checkbox"
            checked={selection.savedScreens}
            onChange={(event) => setSelection((prev) => ({ ...prev, savedScreens: event.target.checked }))}
            className="mr-2"
          />
          保存スクリーン
        </label>
        <label className="rounded-none border border-border-subtle bg-canvas-deep/60 px-3 py-2 text-xs text-text-primary">
          <input
            type="checkbox"
            checked={selection.backtestResults}
            onChange={(event) => setSelection((prev) => ({ ...prev, backtestResults: event.target.checked }))}
            className="mr-2"
          />
          バックテスト結果
        </label>
        <label className="rounded-none border border-border-subtle bg-canvas-deep/60 px-3 py-2 text-xs text-text-primary">
          <input
            type="checkbox"
            checked={selection.holdings}
            onChange={(event) => setSelection((prev) => ({ ...prev, holdings: event.target.checked }))}
            className="mr-2"
          />
          保有データ (JSON)
        </label>
      </div>

      {previewParts.length > 0 && (
        <div className="mt-3 rounded-none bg-white/5 p-3">
          <p className="text-sm text-text-secondary">
            {previewParts.join(", ")}
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onExportJson(selection)}
          className="rounded-none border border-blue/40 bg-blue/10 px-3 py-2 text-xs font-semibold text-blue"
        >
          JSON出力
        </button>
        <button
          type="button"
          onClick={onExportSnapshotsCsv}
          className="rounded-none border border-border-subtle px-3 py-2 text-xs font-semibold text-text-primary"
        >
          スナップショットCSV出力
        </button>
        <button
          type="button"
          onClick={onExportRankingCsv}
          className="rounded-none border border-border-subtle px-3 py-2 text-xs font-semibold text-text-primary"
        >
          ランキングCSV出力
        </button>
        <button
          type="button"
          onClick={onExportPortfolioCsv}
          className="rounded-none border border-border-subtle px-3 py-2 text-xs font-semibold text-text-primary"
        >
          ポートフォリオCSV出力
        </button>
      </div>

      <p className="mt-3 text-xs text-text-muted">
        エクスポートデータにはAPIキー等の秘密情報は含まれません。
      </p>
    </section>
  );
}

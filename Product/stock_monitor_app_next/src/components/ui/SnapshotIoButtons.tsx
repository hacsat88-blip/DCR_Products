"use client";

import { useRef, useState } from "react";
import clsx from "clsx";

import {
  downloadSnapshot,
  importSnapshotFromFile,
  type ImportResult,
} from "@/lib/persistence/snapshotIo";
import type { CommandAction } from "@/lib/commandPalette/actionRegistry";

export interface SnapshotIoButtonsProps {
  className?: string;
}

function summariseImport(result: ImportResult): string {
  const parts = [
    `取り込み ${result.imported.length} 件`,
    `スキップ ${result.skipped.length} 件`,
  ];
  if (result.warnings.length > 0) {
    parts.push(`警告 ${result.warnings.length} 件`);
  }
  return parts.join(" / ");
}

async function runImportFromFile(file: File): Promise<void> {
  try {
    const result = await importSnapshotFromFile(file);
    window.alert(`スナップショットを取り込みました: ${summariseImport(result)}`);
  } catch (error) {
    console.error("[SnapshotIoButtons] import failed", error);
    const message = error instanceof Error ? error.message : String(error);
    window.alert(`取り込みに失敗しました: ${message}`);
  }
}

function runExport(): void {
  try {
    downloadSnapshot();
  } catch (error) {
    console.error("[SnapshotIoButtons] export failed", error);
    const message = error instanceof Error ? error.message : String(error);
    window.alert(`書き出しに失敗しました: ${message}`);
  }
}

/**
 * Programmatically trigger a file picker and import the chosen snapshot.
 * Used by the command palette action (no visible DOM).
 */
function triggerImportPicker(): void {
  if (typeof document === "undefined") return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.style.display = "none";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    void runImportFromFile(file);
  });
  document.body.appendChild(input);
  input.click();
}

/**
 * Command palette actions that wrap snapshot import/export.
 */
export function buildSnapshotActions(): CommandAction[] {
  return [
    {
      id: "snapshot.export",
      label: "スナップショットを書き出し",
      hint: "JSON ダウンロード",
      section: "データ",
      keywords: ["export", "download", "backup", "書き出し", "エクスポート"],
      onSelect: runExport,
    },
    {
      id: "snapshot.import",
      label: "スナップショットを取り込み",
      hint: "JSON 読み込み",
      section: "データ",
      keywords: ["import", "upload", "restore", "取り込み", "インポート"],
      onSelect: triggerImportPicker,
    },
  ];
}

const BUTTON_CLASS = clsx(
  "inp-glass inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs",
  "text-white/80 transition hover:text-white hover:inp-neon-ring",
  "focus:outline-none focus:inp-neon-ring",
);

export function SnapshotIoButtons({
  className,
}: SnapshotIoButtonsProps): JSX.Element {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const onImportClick = (): void => {
    fileRef.current?.click();
  };

  const onFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    // Reset so the same file can be selected again.
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      await runImportFromFile(file);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={onFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={onImportClick}
        disabled={busy}
        className={BUTTON_CLASS}
        aria-label="スナップショットを取り込み"
      >
        <span aria-hidden="true">📥</span>
        <span>取り込み</span>
      </button>
      <button
        type="button"
        onClick={runExport}
        className={BUTTON_CLASS}
        aria-label="スナップショットを書き出し"
      >
        <span aria-hidden="true">📤</span>
        <span>書き出し</span>
      </button>
    </div>
  );
}

export default SnapshotIoButtons;

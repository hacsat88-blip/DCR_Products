import { useCallback, useRef, useState } from"react";

import { parseCsvWatchlistRows, validateCsvImport, validateExportPayload } from"@/lib/importValidator";
import { useStockStore } from"@/store/useStockStore";
import type { ExportPayload, ImportOptions, ImportValidationResult } from"@/types/archive";

type FileType ="json" |"csv" | null;
type MergeStrategy = ImportOptions["mergeStrategy"];
type ImportPhase ="idle" |"preview" |"done";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ImportPanel(): JSX.Element {
 const importData = useStockStore((s) => s.importData);
 const importCsvWatchlist = useStockStore((s) => s.importCsvWatchlist);

 const fileInputRef = useRef<HTMLInputElement>(null);
 const [phase, setPhase] = useState<ImportPhase>("idle");
 const [dragOver, setDragOver] = useState(false);
 const [fileName, setFileName] = useState("");
 const [fileType, setFileType] = useState<FileType>(null);
 const [validation, setValidation] = useState<ImportValidationResult | null>(null);
 const [rawJson, setRawJson] = useState<ExportPayload | null>(null);
 const [rawCsv, setRawCsv] = useState("");
 const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>("skip_duplicates");
 const [targets, setTargets] = useState({
 snapshots: true,
 alertEvents: true,
 savedScreens: true,
 backtestResults: true,
 compareSelection: true,
 });
 const [resultMessage, setResultMessage] = useState("");
 const [errorMessage, setErrorMessage] = useState("");

 const reset = useCallback(() => {
 setPhase("idle");
 setFileName("");
 setFileType(null);
 setValidation(null);
 setRawJson(null);
 setRawCsv("");
 setResultMessage("");
 setErrorMessage("");
 if (fileInputRef.current) {
 fileInputRef.current.value ="";
 }
 }, []);

 const processFile = useCallback((file: File) => {
 setErrorMessage("");
 setResultMessage("");

 if (file.size > MAX_FILE_SIZE) {
 setErrorMessage("ファイルサイズが10MBを超えています。");
 return;
 }

 if (file.size === 0) {
 setErrorMessage("ファイルが空です。");
 return;
 }

 setFileName(file.name);

 const reader = new FileReader();
 reader.onload = () => {
 const text = reader.result as string;

 if (file.name.endsWith(".json") || file.type ==="application/json") {
 try {
 const parsed: unknown = JSON.parse(text);
 const result = validateExportPayload(parsed);
 setFileType("json");
 setValidation(result);
 setRawJson(result.valid ? (parsed as ExportPayload) : null);
 setPhase("preview");
 } catch {
 setErrorMessage("JSONの解析に失敗しました。ファイル形式を確認してください。");
 }
 } else if (file.name.endsWith(".csv") || file.type ==="text/csv") {
 const result = validateCsvImport(text,"watchlist");
 setFileType("csv");
 setValidation(result);
 setRawCsv(text);
 setPhase("preview");
 } else {
 // Auto-detect
 const trimmed = text.trimStart();
 if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
 try {
 const parsed: unknown = JSON.parse(text);
 const result = validateExportPayload(parsed);
 setFileType("json");
 setValidation(result);
 setRawJson(result.valid ? (parsed as ExportPayload) : null);
 setPhase("preview");
 } catch {
 setErrorMessage("JSONの解析に失敗しました。");
 }
 } else {
 const result = validateCsvImport(text,"watchlist");
 setFileType("csv");
 setValidation(result);
 setRawCsv(text);
 setPhase("preview");
 }
 }
 };
 reader.onerror = () => {
 setErrorMessage("ファイルの読み込みに失敗しました。");
 };
 reader.readAsText(file);
 }, []);

 const handleFileInput = useCallback(
 (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) processFile(file);
 },
 [processFile]
 );

 const handleDrop = useCallback(
 (e: React.DragEvent) => {
 e.preventDefault();
 setDragOver(false);
 const file = e.dataTransfer.files[0];
 if (file) processFile(file);
 },
 [processFile]
 );

 const handleDragOver = useCallback((e: React.DragEvent) => {
 e.preventDefault();
 setDragOver(true);
 }, []);

 const handleDragLeave = useCallback(() => {
 setDragOver(false);
 }, []);

 const executeImport = useCallback(() => {
 if (fileType ==="json" && rawJson && validation?.valid) {
 const result = importData(rawJson, { mergeStrategy, targets });
 const parts: string[] = [];
 if (result.imported > 0) parts.push(`${result.imported}件インポート`);
 if (result.skipped > 0) parts.push(`${result.skipped}件スキップ`);
 if (result.errors.length > 0) parts.push(`${result.errors.length}件エラー`);
 setResultMessage(parts.length > 0 ? parts.join("、") :"インポート対象がありませんでした。");
 setPhase("done");
 } else if (fileType ==="csv" && rawCsv) {
 const rows = parseCsvWatchlistRows(rawCsv);
 const result = importCsvWatchlist(rows);
 const parts: string[] = [];
 if (result.added > 0) parts.push(`${result.added}件追加`);
 if (result.skipped > 0) parts.push(`${result.skipped}件スキップ`);
 setResultMessage(parts.length > 0 ? parts.join("、") :"インポート対象がありませんでした。");
 setPhase("done");
 }
 }, [fileType, rawJson, rawCsv, validation, mergeStrategy, targets, importData, importCsvWatchlist]);

 const strategies: { value: MergeStrategy; label: string; desc: string }[] = [
 { value:"overwrite", label:"上書き", desc:"既存データを置き換え" },
 { value:"append", label:"追加", desc:"重複IDは除外して追加" },
 { value:"skip_duplicates", label:"重複スキップ", desc:"新規IDのみ追加" },
 ];

 return (
 <section className="rounded-lg border border-border-subtle bg-panel p-5 shadow-card">
 <div className="mb-3">
 <h2 className="text-lg font-semibold text-text-primary">インポート</h2>
 <p className="text-xs text-text-muted">JSON / CSV ファイルからデータを取り込みます。</p>
 </div>

 {/* Error message */}
 {errorMessage && (
 <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-danger">
 {errorMessage}
 </div>
 )}

 {/* Idle: drop zone */}
 {phase ==="idle" && (
 <div
 onDrop={handleDrop}
 onDragOver={handleDragOver}
 onDragLeave={handleDragLeave}
 onClick={() => fileInputRef.current?.click()}
 className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
 dragOver
 ?"border-secondary bg-secondary/10"
 :"border-border-subtle bg-white/5 hover:border-border-active hover:bg-white/10"
 }`}
 >
 <p className="text-sm text-text-secondary">
 ファイルをドラッグ＆ドロップ
 </p>
 <p className="mt-1 text-xs text-text-muted">
 または クリックして選択（JSON / CSV、最大10MB）
 </p>
 <input
 ref={fileInputRef}
 type="file"
 accept=".json,.csv"
 onChange={handleFileInput}
 className="hidden"
 />
 </div>
 )}

 {/* Preview */}
 {phase ==="preview" && validation && (
 <div className="space-y-3">
 <div className="rounded-lg border border-border-subtle bg-canvas-deep/60 px-3 py-2">
 <p className="text-xs font-medium text-text-primary">
 📄 {fileName}
 <span className="ml-2 rounded-lg bg-glass px-1.5 py-0.5 text-[10px] uppercase text-text-secondary">
 {fileType}
 </span>
 </p>
 </div>

 {/* Validation errors */}
 {validation.errors.length > 0 && (
 <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-danger">
 {validation.errors.map((err, i) => (
 <p key={i}>⛔ {err}</p>
 ))}
 </div>
 )}

 {/* Validation warnings */}
 {validation.warnings.length > 0 && (
 <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300">
 {validation.warnings.map((warn, i) => (
 <p key={i}>⚠️ {warn}</p>
 ))}
 </div>
 )}

 {/* Preview counts */}
 {fileType ==="json" && (
 <div className="grid gap-1 text-xs text-text-secondary">
 {validation.preview.snapshotCount > 0 && (
 <p>スナップショット: {validation.preview.snapshotCount}件</p>
 )}
 {validation.preview.alertEventCount > 0 && (
 <p>アラート履歴: {validation.preview.alertEventCount}件</p>
 )}
 {validation.preview.savedScreenCount > 0 && (
 <p>保存スクリーン: {validation.preview.savedScreenCount}件</p>
 )}
 {validation.preview.backtestResultCount > 0 && (
 <p>バックテスト結果: {validation.preview.backtestResultCount}件</p>
 )}
 {validation.preview.compareSelectionCount > 0 && (
 <p>比較銘柄: {validation.preview.compareSelectionCount}件</p>
 )}
 </div>
 )}

 {fileType ==="csv" && validation.preview.compareSelectionCount > 0 && (
 <p className="text-xs text-text-secondary">
 ウォッチリスト銘柄: {validation.preview.compareSelectionCount}件
 </p>
 )}

 {/* JSON merge options */}
 {fileType ==="json" && validation.valid && (
 <>
 <div>
 <p className="mb-1 text-xs font-medium text-text-secondary">マージ方法</p>
 <div className="grid gap-1">
 {strategies.map((s) => (
 <label
 key={s.value}
 className={`flex cursor-pointer items-center rounded-lg border px-3 py-2 text-xs transition-colors ${
 mergeStrategy === s.value
 ?"border-secondary/60 bg-secondary/10 text-secondary"
 :"border-border-subtle bg-canvas-deep/60 text-text-secondary hover:border-border-subtle"
 }`}
 >
 <input
 type="radio"
 name="mergeStrategy"
 value={s.value}
 checked={mergeStrategy === s.value}
 onChange={() => setMergeStrategy(s.value)}
 className="mr-2"
 />
 <span className="font-medium">{s.label}</span>
 <span className="ml-2 text-text-muted">{s.desc}</span>
 </label>
 ))}
 </div>
 </div>

 <div>
 <p className="mb-1 text-xs font-medium text-text-secondary">インポート対象</p>
 <div className="grid gap-1 md:grid-cols-2">
 {[
 { key:"snapshots" as const, label:"スナップショット", count: validation.preview.snapshotCount },
 { key:"alertEvents" as const, label:"アラート履歴", count: validation.preview.alertEventCount },
 { key:"savedScreens" as const, label:"保存スクリーン", count: validation.preview.savedScreenCount },
 { key:"backtestResults" as const, label:"バックテスト結果", count: validation.preview.backtestResultCount },
 { key:"compareSelection" as const, label:"比較銘柄", count: validation.preview.compareSelectionCount },
 ]
 .filter((t) => t.count > 0)
 .map((t) => (
 <label
 key={t.key}
 className="rounded-lg border border-border-subtle bg-canvas-deep/60 px-3 py-2 text-xs text-text-primary"
 >
 <input
 type="checkbox"
 checked={targets[t.key]}
 onChange={(e) => setTargets((prev) => ({ ...prev, [t.key]: e.target.checked }))}
 className="mr-2"
 />
 {t.label} ({t.count})
 </label>
 ))}
 </div>
 </div>
 </>
 )}

 {/* Action buttons */}
 <div className="flex flex-wrap gap-2">
 <button
 type="button"
 onClick={executeImport}
 disabled={!validation.valid}
 className="rounded-lg border border-secondary/40 bg-secondary/10 px-3 py-2 text-xs font-semibold text-secondary disabled:cursor-not-allowed disabled:opacity-40"
 >
 インポート実行
 </button>
 <button
 type="button"
 onClick={reset}
 className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-secondary"
 >
 キャンセル
 </button>
 </div>
 </div>
 )}

 {/* Done */}
 {phase ==="done" && (
 <div className="space-y-3">
 {resultMessage && (
 <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-xs text-positive">
 ✅ {resultMessage}
 </div>
 )}
 <button
 type="button"
 onClick={reset}
 className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-secondary"
 >
 別のファイルをインポート
 </button>
 </div>
 )}

 <p className="mt-3 text-xs text-text-muted">
 JSON はエクスポート形式に準拠。CSV は code カラム必須（ウォッチリスト追加）。
 </p>
 </section>
 );
}

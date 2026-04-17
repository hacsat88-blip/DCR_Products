// ────────────────────────────────────────────────
// Snapshot I/O — Whole-app JSON export / import
// ────────────────────────────────────────────────
//
// Collects every persisted key managed by the dashboard, the navigator,
// the portfolio (Phase 4), and the alert centre into a single JSON
// document. Used by the ⌘K Command Palette and the dashboard toolbar.

import {
  getPersistenceAdapter,
  readPersistedString,
  writePersistedString,
} from "@/lib/persistenceLayer";

export const SNAPSHOT_SCHEMA_VERSION = 2;

/**
 * Keys that belong to a full snapshot. When adding a new Zustand slice,
 * register its storage key here so export/import stays exhaustive.
 */
export const SNAPSHOT_KEYS: readonly string[] = [
  "stock-monitor-archive-snapshots-v1",
  "stock-monitor-saved-screens-v1",
  "stock-monitor-compare-selection-v1",
  "stock-monitor-autosave-snapshots-v1",
  "stock-monitor-ranking-sort-v1",
  "stock-monitor-archive-schema-version",
  "stock-monitor-scoring-config-v1",
  "stock-monitor-alert-rules-v1",
  "stock-monitor-alert-events-v1",
  "stock-monitor-alert-settings-v1",
  // Phase 4 additions
  "inp-portfolio-holdings-v1",
  "inp-portfolio-history-v1",
  "inp-backtest-runs-v1",
  "inp-dashboard-layout-v1",
  "inp-radar-weights-v1",
  // Phase 4 — holdings store (new)
  "stock-monitor:holdings:v1",
  // Phase 4 — backtest + alerts stores (new)
  "stock-monitor:backtest:v1",
  "stock-monitor:alerts:v1",
] as const;

export interface Snapshot {
  schema: typeof SNAPSHOT_SCHEMA_VERSION;
  exportedAt: string;
  app: "investment-navigator-pro";
  entries: Record<string, string>;
}

export function exportSnapshot(): Snapshot {
  const entries: Record<string, string> = {};
  for (const key of SNAPSHOT_KEYS) {
    const value = readPersistedString(key, "");
    if (value) entries[key] = value;
  }
  return {
    schema: SNAPSHOT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    app: "investment-navigator-pro",
    entries,
  };
}

export interface ImportResult {
  imported: string[];
  skipped: string[];
  warnings: string[];
}

export function validateSnapshot(candidate: unknown): candidate is Snapshot {
  if (!candidate || typeof candidate !== "object") return false;
  const snap = candidate as Partial<Snapshot>;
  if (snap.app !== "investment-navigator-pro") return false;
  if (typeof snap.schema !== "number") return false;
  if (!snap.entries || typeof snap.entries !== "object") return false;
  return true;
}

/**
 * Import a snapshot. `strategy` controls whether existing keys are
 * overwritten or preserved. Keys outside {@link SNAPSHOT_KEYS} are
 * ignored so hostile payloads cannot arbitrarily pollute storage.
 */
export function importSnapshot(
  snapshot: Snapshot,
  strategy: "overwrite" | "merge" = "overwrite",
): ImportResult {
  const adapter = getPersistenceAdapter();
  const result: ImportResult = { imported: [], skipped: [], warnings: [] };

  if (!adapter) {
    result.warnings.push("No persistence adapter available — import is a no-op.");
    return result;
  }

  if (snapshot.schema > SNAPSHOT_SCHEMA_VERSION) {
    result.warnings.push(
      `Snapshot schema ${snapshot.schema} is newer than this build (${SNAPSHOT_SCHEMA_VERSION}). Some keys may be ignored.`,
    );
  }

  for (const [key, value] of Object.entries(snapshot.entries)) {
    if (!SNAPSHOT_KEYS.includes(key)) {
      result.skipped.push(key);
      continue;
    }
    if (strategy === "merge" && readPersistedString(key, "")) {
      result.skipped.push(key);
      continue;
    }
    const ok = writePersistedString(key, value);
    if (ok) result.imported.push(key);
    else result.warnings.push(`Failed to write ${key}`);
  }

  return result;
}

/**
 * Download a snapshot as a JSON file in the browser. Server-side callers
 * should use {@link exportSnapshot} and serialise manually.
 */
export function downloadSnapshot(filename?: string): void {
  if (typeof window === "undefined") return;
  const snapshot = exportSnapshot();
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    filename ??
    `investment-navigator-pro-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Read a user-selected File (JSON) and apply it. Returns the ImportResult.
 */
export async function importSnapshotFromFile(
  file: File,
  strategy: "overwrite" | "merge" = "overwrite",
): Promise<ImportResult> {
  const text = await file.text();
  const parsed = JSON.parse(text) as unknown;
  if (!validateSnapshot(parsed)) {
    throw new Error("Invalid snapshot file: missing app identifier or entries.");
  }
  return importSnapshot(parsed, strategy);
}

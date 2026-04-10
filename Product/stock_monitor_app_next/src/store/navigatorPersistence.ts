import { readPersistedJSON, writePersistedJSON } from "@/lib/persistenceLayer";
import type {
  NavigatorSettings,
  NavigatorAnalysisMode,
  MacroResult,
  StockSelectionResult,
  DebateResult,
  FinalEvaluation,
} from "@/types/navigator";

const STORAGE_KEY = "stock-monitor-navigator-v1";
export const NAVIGATOR_EXPORT_VERSION = "1.0";

export interface PersistedNavigator {
  settings: NavigatorSettings | null;
  macro: MacroResult | null;
  stocks: StockSelectionResult | null;
  debate: DebateResult | null;
  final: FinalEvaluation | null;
  analysisMode?: NavigatorAnalysisMode;
  executedAt: string | null;
}

export interface NavigatorPersistableSnapshot {
  settings: NavigatorSettings | null;
  macro: MacroResult | null;
  stocks: StockSelectionResult | null;
  debate: DebateResult | null;
  final: FinalEvaluation | null;
  analysisMode: NavigatorAnalysisMode;
  executedAt: string | null;
}

export function readNavigatorStorage(): PersistedNavigator | null {
  return readPersistedJSON<PersistedNavigator | null>(STORAGE_KEY, null);
}

export function persistNavigatorSnapshot(snapshot: NavigatorPersistableSnapshot): void {
  if (!writePersistedJSON(STORAGE_KEY, snapshot)) {
    console.warn("[navigator-storage] failed to persist.");
  }
}

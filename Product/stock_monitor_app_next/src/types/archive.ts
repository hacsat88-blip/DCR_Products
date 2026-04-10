export type RankingSortKey =
  | "score_desc"
  | "price_asc"
  | "price_desc"
  | "revenue_growth_desc"
  | "op_growth_desc"
  | "operating_cf_desc"
  | "per_asc"
  | "backtest_excess_desc"
  | "action_priority";

export type SnapshotCaptureSource = "manual" | "autosave";

export interface StockSnapshot {
  id: string;
  captureId: string;
  captureSource?: SnapshotCaptureSource;
  code: string;
  name: string;
  checkedAt: string;
  price: number | null;
  changePercent: number | null;
  marketCap: number | null;
  per: number | null;
  pbr: number | null;
  dividendYield: number | null;
  revenueGrowth: number | null;
  opGrowth: number | null;
  operatingCF: number | null;
  score: number | null;
  evaluatedAction: string | null;
  scoreSummary: string;
  narrativeSummary?: string;
  coreKpiLabel?: string;
  coreKpiValue?: string;
  riskSignal?: string;
  collapseCondition?: string;
  dataMode?: string | null;
  providerHealth?: string | null;
}

export interface SavedScreen {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  sortKey: string;
  rankingSortKey?: string;
  compareSelection?: string[];
  sortOrder?: "asc" | "desc";
  createdAt: string;
  updatedAt: string;
}

export type NormalizedStockSnapshot = Omit<StockSnapshot, "captureSource"> & {
  captureSource: SnapshotCaptureSource;
};

export type NormalizedSavedScreen = Omit<SavedScreen, "rankingSortKey" | "compareSelection"> & {
  rankingSortKey: RankingSortKey;
  compareSelection: string[];
};

export interface CompareSelection {
  codes: string[];
}

export interface ExportPayload {
  schemaVersion: string;
  exportedAt: string;
  compareSelection?: string[];
  snapshots?: StockSnapshot[];
  alertEvents?: unknown[];
  savedScreens?: SavedScreen[];
  backtestResults?: unknown[];
  holdings?: Record<string, number>;
}

export interface ImportOptions {
  mergeStrategy: 'overwrite' | 'append' | 'skip_duplicates';
  targets: {
    snapshots?: boolean;
    alertEvents?: boolean;
    savedScreens?: boolean;
    backtestResults?: boolean;
    compareSelection?: boolean;
  };
}

export interface ImportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  preview: {
    snapshotCount: number;
    alertEventCount: number;
    savedScreenCount: number;
    backtestResultCount: number;
    compareSelectionCount: number;
  };
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface CsvImportResult {
  added: number;
  skipped: number;
}

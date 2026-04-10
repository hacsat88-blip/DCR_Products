import { beforeEach, describe, it, expect } from "vitest";
import {
  validateExportPayload,
  validateCsvImport,
  parseCsvWatchlistRows,
} from "@/lib/importValidator";
import { normalizeExportPayloadForImport, useStockStore } from "@/store/useStockStore";
import type { ExportPayload, StockSnapshot } from "@/types/archive";

describe("validateExportPayload", () => {
  describe("valid payloads", () => {
    it("accepts a minimal valid payload", () => {
      const data = {
        schemaVersion: "phase5-export-v1",
        exportedAt: "2024-01-01T00:00:00Z",
      };
      const result = validateExportPayload(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("accepts payload with valid snapshots", () => {
      const data = {
        schemaVersion: "phase5-export-v1",
        exportedAt: "2024-01-01T00:00:00Z",
        snapshots: [
          { code: "9424", name: "日本通信", checkedAt: "2024-01-01T00:00:00Z" },
        ],
      };
      const result = validateExportPayload(data);
      expect(result.valid).toBe(true);
      expect(result.preview.snapshotCount).toBe(1);
    });

    it("accepts payload with valid alertEvents", () => {
      const data = {
        schemaVersion: "phase5-export-v1",
        exportedAt: "2024-01-01T00:00:00Z",
        alertEvents: [
          { id: "e1", title: "Alert 1", triggeredAt: "2024-01-01T00:00:00Z" },
        ],
      };
      const result = validateExportPayload(data);
      expect(result.valid).toBe(true);
      expect(result.preview.alertEventCount).toBe(1);
    });

    it("accepts payload with valid savedScreens", () => {
      const data = {
        schemaVersion: "phase5-export-v1",
        exportedAt: "2024-01-01T00:00:00Z",
        savedScreens: [
          { id: "s1", name: "Screen 1", filters: { query: "" } },
        ],
      };
      const result = validateExportPayload(data);
      expect(result.valid).toBe(true);
      expect(result.preview.savedScreenCount).toBe(1);
    });

    it("accepts payload with valid backtestResults", () => {
      const data = {
        schemaVersion: "phase5-export-v1",
        exportedAt: "2024-01-01T00:00:00Z",
        backtestResults: [
          { id: "bt1", startedAt: "2024-01-01", endedAt: "2024-06-01" },
        ],
      };
      const result = validateExportPayload(data);
      expect(result.valid).toBe(true);
      expect(result.preview.backtestResultCount).toBe(1);
    });

    it("accepts payload with valid compareSelection", () => {
      const data = {
        schemaVersion: "phase5-export-v1",
        exportedAt: "2024-01-01T00:00:00Z",
        compareSelection: ["9424", "2337"],
      };
      const result = validateExportPayload(data);
      expect(result.valid).toBe(true);
      expect(result.preview.compareSelectionCount).toBe(2);
    });
  });

  describe("invalid payloads", () => {
    it("rejects non-object input", () => {
      const result = validateExportPayload("not an object");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("JSONオブジェクトではありません。");
    });

    it("rejects null input", () => {
      const result = validateExportPayload(null);
      expect(result.valid).toBe(false);
    });

    it("rejects array input", () => {
      const result = validateExportPayload([1, 2, 3]);
      expect(result.valid).toBe(false);
    });

    it("reports error when schemaVersion is missing", () => {
      const data = { exportedAt: "2024-01-01T00:00:00Z" };
      const result = validateExportPayload(data);
      expect(result.errors).toContain("schemaVersion フィールドがありません。");
    });

    it("reports error when snapshots is not an array", () => {
      const data = {
        schemaVersion: "phase5-export-v1",
        exportedAt: "2024-01-01T00:00:00Z",
        snapshots: "invalid",
      };
      const result = validateExportPayload(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("snapshots はArray形式である必要があります。");
    });

    it("reports error when alertEvents is not an array", () => {
      const data = {
        schemaVersion: "phase5-export-v1",
        alertEvents: { bad: true },
      };
      const result = validateExportPayload(data);
      expect(result.valid).toBe(false);
    });

    it("reports error when compareSelection contains non-strings", () => {
      const data = {
        schemaVersion: "phase5-export-v1",
        compareSelection: [1, 2, 3],
      };
      const result = validateExportPayload(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("compareSelection は文字列配列である必要があります。");
    });
  });

  describe("warnings", () => {
    it("warns when schemaVersion does not match expected prefix", () => {
      const data = {
        schemaVersion: "unknown-v2",
        exportedAt: "2024-01-01T00:00:00Z",
      };
      const result = validateExportPayload(data);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes("スキーマバージョンが異なります"))).toBe(true);
    });

    it("warns when exportedAt is missing", () => {
      const data = { schemaVersion: "phase5-export-v1" };
      const result = validateExportPayload(data);
      expect(result.warnings.some((w) => w.includes("exportedAt"))).toBe(true);
    });

    it("warns about invalid snapshot items in the array", () => {
      const data = {
        schemaVersion: "phase5-export-v1",
        exportedAt: "2024-01-01T00:00:00Z",
        snapshots: [
          { code: "9424", name: "日本通信", checkedAt: "2024-01-01T00:00:00Z" },
          { bad: "data" },
        ],
      };
      const result = validateExportPayload(data);
      expect(result.preview.snapshotCount).toBe(1);
      expect(result.warnings.some((w) => w.includes("スナップショット"))).toBe(true);
    });
  });
});

describe("snapshot capture integrity", () => {
  it("preserves captureId and captureSource through export/import normalization", () => {
    const createSnapshot = (overrides: Partial<StockSnapshot>): StockSnapshot => ({
      id: "snapshot-default",
      captureId: "capture-default",
      code: "0000",
      name: "default",
      checkedAt: "2024-01-01T00:00:00Z",
      price: null,
      changePercent: null,
      marketCap: null,
      per: null,
      pbr: null,
      dividendYield: null,
      revenueGrowth: null,
      opGrowth: null,
      operatingCF: null,
      score: null,
      evaluatedAction: null,
      scoreSummary: "",
      ...overrides,
    });

    const exported: ExportPayload = {
      schemaVersion: "phase5-export-v1",
      exportedAt: "2024-01-01T00:00:00Z",
      snapshots: [
        createSnapshot({
          id: "snap-1",
          captureId: "",
          code: "9424",
          name: "日本通信",
          checkedAt: "2024-01-01T00:00:00Z",
        }),
        createSnapshot({
          id: "snap-2",
          captureId: "capture-existing",
          code: "2337",
          name: "いちご",
          checkedAt: "2024-01-01T00:05:00Z",
        }),
      ],
    };

    const normalized = normalizeExportPayloadForImport(exported);

    expect(normalized.snapshots?.[0]).toMatchObject({
      captureId: expect.any(String),
      captureSource: "manual",
    });
    expect(normalized.snapshots?.[1]).toMatchObject({
      captureId: "capture-existing",
      captureSource: "manual",
    });
  });
});

describe("snapshot import hardening", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useStockStore.setState(useStockStore.getInitialState(), true);
  });

  it("does not crash on malformed checkedAt rows and keeps import stable", () => {
    const createSnapshot = (overrides: Partial<StockSnapshot>): StockSnapshot => ({
      id: "snapshot-default",
      captureId: "capture-default",
      code: "0000",
      name: "default",
      checkedAt: "2024-01-01T00:00:00Z",
      price: null,
      changePercent: null,
      marketCap: null,
      per: null,
      pbr: null,
      dividendYield: null,
      revenueGrowth: null,
      opGrowth: null,
      operatingCF: null,
      score: null,
      evaluatedAction: null,
      scoreSummary: "",
      ...overrides,
    });

    const exported: ExportPayload = {
      schemaVersion: "phase5-export-v1",
      exportedAt: "2024-01-01T00:00:00Z",
      snapshots: [
        createSnapshot({
          id: "snap-valid",
          code: "9424",
          name: "日本通信",
          checkedAt: "2024-01-01T00:00:00Z",
        }),
        createSnapshot({
          id: "snap-malformed",
          captureId: "",
          code: "2337",
          name: "いちご",
          checkedAt: 12345 as unknown as string,
        }),
      ],
    };

    expect(() => normalizeExportPayloadForImport(exported)).not.toThrow();
    const normalized = normalizeExportPayloadForImport(exported);

    expect(normalized.snapshots?.[1]).toMatchObject({
      captureId: expect.stringContaining("capture-import-unknown-"),
      captureSource: "manual",
      checkedAt: 12345,
    });

    const result = useStockStore.getState().importData(normalized, {
      mergeStrategy: "overwrite",
      targets: { snapshots: true },
    });

    expect(result.errors).toEqual([]);
    expect(result.imported).toBe(1);
    expect(useStockStore.getState().snapshots).toHaveLength(1);
    expect(useStockStore.getState().snapshots[0].id).toBe("snap-valid");
  });
});

describe("validateCsvImport", () => {
  it("validates a well-formed CSV for watchlist import", () => {
    const csv = "code,name\n9424,日本通信\n2337,いちご";
    const result = validateCsvImport(csv, "watchlist");
    expect(result.valid).toBe(true);
    expect(result.preview.compareSelectionCount).toBe(2);
  });

  it("rejects empty CSV", () => {
    const result = validateCsvImport("", "watchlist");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("CSVファイルが空です。");
  });

  it("rejects CSV without code column", () => {
    const csv = "name,sector\n日本通信,IT";
    const result = validateCsvImport(csv, "watchlist");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("'code' カラムが見つかりません。");
  });

  it("warns about invalid stock codes", () => {
    const csv = "code,name\n9424,日本通信\nABC,Invalid\n12345,TooLong";
    const result = validateCsvImport(csv, "watchlist");
    expect(result.valid).toBe(true);
    expect(result.preview.compareSelectionCount).toBe(1);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("warns when holdings import has no shares column", () => {
    const csv = "code,name\n9424,日本通信";
    const result = validateCsvImport(csv, "holdings");
    expect(result.warnings.some((w) => w.includes("shares"))).toBe(true);
  });

  it("handles CSV with quoted fields", () => {
    const csv = 'code,name\n9424,"日本通信株式会社"\n2337,"いちご"';
    const result = validateCsvImport(csv, "watchlist");
    expect(result.valid).toBe(true);
    expect(result.preview.compareSelectionCount).toBe(2);
  });
});

describe("parseCsvWatchlistRows", () => {
  it("parses valid CSV into rows", () => {
    const csv = "code,name\n9424,日本通信\n2337,いちご";
    const rows = parseCsvWatchlistRows(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].code).toBe("9424");
    expect(rows[0].name).toBe("日本通信");
    expect(rows[1].code).toBe("2337");
  });

  it("returns empty array for CSV with only header", () => {
    const csv = "code,name";
    const rows = parseCsvWatchlistRows(csv);
    expect(rows).toHaveLength(0);
  });

  it("returns empty array for CSV without code column", () => {
    const csv = "name,sector\n日本通信,IT";
    const rows = parseCsvWatchlistRows(csv);
    expect(rows).toHaveLength(0);
  });

  it("skips rows with invalid codes", () => {
    const csv = "code,name\n9424,日本通信\nABC,Invalid";
    const rows = parseCsvWatchlistRows(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].code).toBe("9424");
  });

  it("handles name column absence gracefully", () => {
    const csv = "code\n9424\n2337";
    const rows = parseCsvWatchlistRows(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBeUndefined();
  });

  it("handles CSV with Windows line endings", () => {
    const csv = "code,name\r\n9424,日本通信\r\n2337,いちご";
    const rows = parseCsvWatchlistRows(csv);
    expect(rows).toHaveLength(2);
  });
});

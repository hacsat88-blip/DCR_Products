import type { ImportValidationResult } from "@/types/archive";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validateSnapshotItem(item: unknown): boolean {
  if (!isRecord(item)) return false;
  return (
    typeof item.code === "string" &&
    typeof item.name === "string" &&
    typeof item.checkedAt === "string"
  );
}

function validateAlertEventItem(item: unknown): boolean {
  if (!isRecord(item)) return false;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.triggeredAt === "string"
  );
}

function validateSavedScreenItem(item: unknown): boolean {
  if (!isRecord(item)) return false;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    isRecord(item.filters)
  );
}

function validateBacktestResultItem(item: unknown): boolean {
  if (!isRecord(item)) return false;
  return (
    typeof item.id === "string" &&
    typeof item.startedAt === "string" &&
    typeof item.endedAt === "string"
  );
}

export function validateExportPayload(data: unknown): ImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const preview = {
    snapshotCount: 0,
    alertEventCount: 0,
    savedScreenCount: 0,
    backtestResultCount: 0,
    compareSelectionCount: 0,
  };

  if (!isRecord(data)) {
    return { valid: false, errors: ["JSONオブジェクトではありません。"], warnings, preview };
  }

  if (typeof data.schemaVersion !== "string") {
    errors.push("schemaVersion フィールドがありません。");
  } else if (!data.schemaVersion.startsWith("phase5-export")) {
    warnings.push(`スキーマバージョンが異なります: ${data.schemaVersion}`);
  }

  if (typeof data.exportedAt !== "string") {
    warnings.push("exportedAt フィールドがありません。");
  }

  if (data.snapshots !== undefined) {
    if (!Array.isArray(data.snapshots)) {
      errors.push("snapshots はArray形式である必要があります。");
    } else {
      let validCount = 0;
      for (const item of data.snapshots) {
        if (validateSnapshotItem(item)) {
          validCount++;
        }
      }
      preview.snapshotCount = validCount;
      if (validCount < data.snapshots.length) {
        warnings.push(
          `スナップショット ${data.snapshots.length - validCount}件が無効な形式です。`
        );
      }
    }
  }

  if (data.alertEvents !== undefined) {
    if (!Array.isArray(data.alertEvents)) {
      errors.push("alertEvents はArray形式である必要があります。");
    } else {
      let validCount = 0;
      for (const item of data.alertEvents) {
        if (validateAlertEventItem(item)) {
          validCount++;
        }
      }
      preview.alertEventCount = validCount;
      if (validCount < data.alertEvents.length) {
        warnings.push(
          `アラートイベント ${data.alertEvents.length - validCount}件が無効な形式です。`
        );
      }
    }
  }

  if (data.savedScreens !== undefined) {
    if (!Array.isArray(data.savedScreens)) {
      errors.push("savedScreens はArray形式である必要があります。");
    } else {
      let validCount = 0;
      for (const item of data.savedScreens) {
        if (validateSavedScreenItem(item)) {
          validCount++;
        }
      }
      preview.savedScreenCount = validCount;
      if (validCount < data.savedScreens.length) {
        warnings.push(
          `保存スクリーン ${data.savedScreens.length - validCount}件が無効な形式です。`
        );
      }
    }
  }

  if (data.backtestResults !== undefined) {
    if (!Array.isArray(data.backtestResults)) {
      errors.push("backtestResults はArray形式である必要があります。");
    } else {
      let validCount = 0;
      for (const item of data.backtestResults) {
        if (validateBacktestResultItem(item)) {
          validCount++;
        }
      }
      preview.backtestResultCount = validCount;
      if (validCount < data.backtestResults.length) {
        warnings.push(
          `バックテスト結果 ${data.backtestResults.length - validCount}件が無効な形式です。`
        );
      }
    }
  }

  if (data.compareSelection !== undefined) {
    if (!isStringArray(data.compareSelection)) {
      errors.push("compareSelection は文字列配列である必要があります。");
    } else {
      preview.compareSelectionCount = data.compareSelection.length;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    preview,
  };
}

interface CsvParseRow {
  code: string;
  name?: string;
}

function parseCsvLines(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return lines.map((line) => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          fields.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    fields.push(current.trim());
    return fields;
  });
}

export function validateCsvImport(
  csvText: string,
  type: "holdings" | "watchlist"
): ImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const preview = {
    snapshotCount: 0,
    alertEventCount: 0,
    savedScreenCount: 0,
    backtestResultCount: 0,
    compareSelectionCount: 0,
  };

  const rows = parseCsvLines(csvText);
  if (rows.length === 0) {
    return { valid: false, errors: ["CSVファイルが空です。"], warnings, preview };
  }

  const header = rows[0].map((h) => h.toLowerCase());
  const codeIdx = header.indexOf("code");
  if (codeIdx === -1) {
    return {
      valid: false,
      errors: ["'code' カラムが見つかりません。"],
      warnings,
      preview,
    };
  }

  if (type === "holdings") {
    const sharesIdx = header.indexOf("shares");
    if (sharesIdx === -1) {
      warnings.push("'shares' カラムが見つかりません。ウォッチリストとしてインポートします。");
    }
  }

  let validRows = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const code = row[codeIdx];
    if (!code || !/^\d{4}$/.test(code)) {
      warnings.push(`行${i + 1}: 無効な銘柄コード "${code ?? ""}"`);
      continue;
    }
    validRows++;
  }

  preview.compareSelectionCount = validRows;

  return {
    valid: validRows > 0,
    errors,
    warnings,
    preview,
  };
}

export function parseCsvWatchlistRows(
  csvText: string
): CsvParseRow[] {
  const rows = parseCsvLines(csvText);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.toLowerCase());
  const codeIdx = header.indexOf("code");
  if (codeIdx === -1) return [];
  const nameIdx = header.indexOf("name");

  const result: CsvParseRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const code = row[codeIdx];
    if (!code || !/^\d{4}$/.test(code)) continue;
    const name = nameIdx >= 0 ? row[nameIdx] : undefined;
    result.push({ code, name: name || undefined });
  }
  return result;
}

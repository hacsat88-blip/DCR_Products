import {
  hasPersistedValue,
  readPersistedJSON,
  readPersistedString,
  writePersistedJSON,
  writePersistedString
} from "@/lib/persistenceLayer";

export function readJSON<T>(key: string, fallback: T): T {
  return readPersistedJSON(key, fallback);
}

export function writeJSON<T>(key: string, value: T): boolean {
  return writePersistedJSON(key, value);
}

export function readString(key: string, fallback: string): string {
  return readPersistedString(key, fallback);
}

export function writeString(key: string, value: string): boolean {
  return writePersistedString(key, value);
}

export function hasStoredValue(key: string): boolean {
  return hasPersistedValue(key);
}

export function notifyStorageFailure(operation: string): void {
  console.warn(`[storage] ${operation} failed to persist.`);
  if (typeof window !== "undefined" && typeof window.alert === "function") {
    window.alert("保存に失敗しました");
  }
}

import { isArtifactRuntime } from "@/lib/runtimeConfig";

export interface PersistenceAdapter {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

declare global {
  // eslint-disable-next-line no-var
  var __STOCK_MONITOR_PERSISTENCE__: PersistenceAdapter | undefined;

  interface Window {
    __STOCK_MONITOR_PERSISTENCE__?: PersistenceAdapter;
  }
}

const memoryStore = new Map<string, string>();

const memoryPersistenceAdapter: PersistenceAdapter = {
  getItem: (key) => memoryStore.get(key) ?? null,
  setItem: (key, value) => {
    memoryStore.set(key, value);
  },
  removeItem: (key) => {
    memoryStore.delete(key);
  }
};

function canUseBrowserStorage(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const probeKey = "__stock-monitor-persistence-probe__";
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

export function getPersistenceAdapter(): PersistenceAdapter | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (globalThis.__STOCK_MONITOR_PERSISTENCE__) {
    return globalThis.__STOCK_MONITOR_PERSISTENCE__;
  }

  if (isArtifactRuntime()) {
    return memoryPersistenceAdapter;
  }

  return canUseBrowserStorage() ? window.localStorage : null;
}

export function hasPersistedValue(key: string): boolean {
  const adapter = getPersistenceAdapter();
  return adapter?.getItem(key) !== null;
}

export function readPersistedJSON<T>(key: string, fallback: T): T {
  const raw = readPersistedString(key, "");
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writePersistedJSON<T>(key: string, value: T): boolean {
  try {
    return writePersistedString(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[persistence] failed to serialize key: ${key}`, error);
    return false;
  }
}

export function readPersistedString(key: string, fallback: string): string {
  const adapter = getPersistenceAdapter();
  if (!adapter) {
    return fallback;
  }

  const value = adapter.getItem(key);
  return value ?? fallback;
}

export function writePersistedString(key: string, value: string): boolean {
  const adapter = getPersistenceAdapter();
  if (!adapter) {
    return false;
  }

  try {
    adapter.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[persistence] failed to write key: ${key}`, error);
    return false;
  }
}

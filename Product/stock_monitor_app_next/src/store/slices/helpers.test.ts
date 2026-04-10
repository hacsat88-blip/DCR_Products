import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { hasStoredValue, readJSON, readString, writeJSON, writeString } from "./helpers";

type TestGlobals = typeof globalThis & {
  __STOCK_MONITOR_RUNTIME__?: {
    runtime?: "nextjs" | "artifact";
  };
  __STOCK_MONITOR_PERSISTENCE__?: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
  };
};

function createPersistenceStub() {
  const store = new Map<string, string>();

  return {
    store,
    adapter: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      }
    }
  };
}

describe("store slice helpers persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete (globalThis as TestGlobals).__STOCK_MONITOR_RUNTIME__;
    delete (globalThis as TestGlobals).__STOCK_MONITOR_PERSISTENCE__;
  });

  afterEach(() => {
    delete (globalThis as TestGlobals).__STOCK_MONITOR_RUNTIME__;
    delete (globalThis as TestGlobals).__STOCK_MONITOR_PERSISTENCE__;
  });

  it("routes JSON persistence through the runtime adapter", () => {
    const stub = createPersistenceStub();
    (globalThis as TestGlobals).__STOCK_MONITOR_RUNTIME__ = { runtime: "artifact" };
    (globalThis as TestGlobals).__STOCK_MONITOR_PERSISTENCE__ = stub.adapter;

    expect(writeJSON("helpers-json", { enabled: true })).toBe(true);
    expect(readJSON("helpers-json", { enabled: false })).toEqual({ enabled: true });
    expect(hasStoredValue("helpers-json")).toBe(true);
    expect(stub.store.get("helpers-json")).toBe(JSON.stringify({ enabled: true }));
    expect(window.localStorage.getItem("helpers-json")).toBeNull();
  });

  it("routes string persistence through the runtime adapter", () => {
    const stub = createPersistenceStub();
    (globalThis as TestGlobals).__STOCK_MONITOR_RUNTIME__ = { runtime: "artifact" };
    (globalThis as TestGlobals).__STOCK_MONITOR_PERSISTENCE__ = stub.adapter;

    expect(writeString("helpers-string", "artifact-mode")).toBe(true);
    expect(readString("helpers-string", "fallback")).toBe("artifact-mode");
    expect(hasStoredValue("helpers-string")).toBe(true);
    expect(stub.store.get("helpers-string")).toBe("artifact-mode");
    expect(window.localStorage.getItem("helpers-string")).toBeNull();
  });
});

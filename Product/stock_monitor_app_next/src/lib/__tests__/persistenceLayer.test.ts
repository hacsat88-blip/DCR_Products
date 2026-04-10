import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readPersistedJSON, readPersistedString, writePersistedJSON, writePersistedString } from "@/lib/persistenceLayer";
import { getRuntimeConfig } from "@/lib/runtimeConfig";

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

describe("persistenceLayer", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete (globalThis as TestGlobals).__STOCK_MONITOR_RUNTIME__;
    delete (globalThis as TestGlobals).__STOCK_MONITOR_PERSISTENCE__;
  });

  afterEach(() => {
    delete (globalThis as TestGlobals).__STOCK_MONITOR_RUNTIME__;
    delete (globalThis as TestGlobals).__STOCK_MONITOR_PERSISTENCE__;
  });

  it("defaults to the nextjs runtime", () => {
    expect(getRuntimeConfig()).toMatchObject({
      runtime: "nextjs"
    });
  });

  it("uses browser localStorage in nextjs runtime", () => {
    expect(writePersistedString("runtime-next", "browser")).toBe(true);
    expect(writePersistedJSON("runtime-next-json", { ok: true })).toBe(true);

    expect(window.localStorage.getItem("runtime-next")).toBe("browser");
    expect(readPersistedString("runtime-next", "fallback")).toBe("browser");
    expect(readPersistedJSON("runtime-next-json", { ok: false })).toEqual({ ok: true });
  });

  it("uses injected artifact persistence instead of browser localStorage", () => {
    const stub = createPersistenceStub();

    (globalThis as TestGlobals).__STOCK_MONITOR_RUNTIME__ = { runtime: "artifact" };
    (globalThis as TestGlobals).__STOCK_MONITOR_PERSISTENCE__ = stub.adapter;

    expect(getRuntimeConfig()).toMatchObject({
      runtime: "artifact"
    });
    expect(writePersistedString("runtime-artifact", "artifact")).toBe(true);
    expect(writePersistedJSON("runtime-artifact-json", { ok: true })).toBe(true);

    expect(stub.store.get("runtime-artifact")).toBe("artifact");
    expect(stub.store.get("runtime-artifact-json")).toBe(JSON.stringify({ ok: true }));
    expect(window.localStorage.getItem("runtime-artifact")).toBeNull();
    expect(readPersistedString("runtime-artifact", "fallback")).toBe("artifact");
    expect(readPersistedJSON("runtime-artifact-json", { ok: false })).toEqual({ ok: true });
  });
});

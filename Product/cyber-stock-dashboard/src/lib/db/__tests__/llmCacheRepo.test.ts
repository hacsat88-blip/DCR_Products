import { describe, it, expect } from "vitest";
import { createTestDb } from "./helper";
import {
  getLlmCache,
  setLlmCache,
  invalidateLlmCache,
  pruneExpiredLlmCache,
} from "../repositories/llmCacheRepo";

describe("llmCacheRepo", () => {
  it("set / get respects ttl", () => {
    const db = createTestDb() as never;
    setLlmCache(db, {
      key: "k1",
      model: "m",
      payload: "{\"a\":1}",
      ttlMs: 60_000,
    });
    const hit = getLlmCache(db, "k1");
    expect(hit?.payload).toBe("{\"a\":1}");

    const future = new Date(Date.now() + 120_000);
    expect(getLlmCache(db, "k1", future)).toBeUndefined();
  });

  it("invalidate and prune", () => {
    const db = createTestDb() as never;
    setLlmCache(db, { key: "k2", model: "m", payload: "x", ttlMs: 60_000 });
    invalidateLlmCache(db, "k2");
    expect(getLlmCache(db, "k2")).toBeUndefined();

    setLlmCache(db, { key: "k3", model: "m", payload: "x", ttlMs: 1 });
    pruneExpiredLlmCache(db, new Date(Date.now() + 1000));
    expect(getLlmCache(db, "k3")).toBeUndefined();
  });
});

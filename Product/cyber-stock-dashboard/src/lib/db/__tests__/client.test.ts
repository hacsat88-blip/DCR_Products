import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type DbCache = {
  __dbInstance?: { $client?: { close?: () => void } };
  __dbDriver?: "sqlite" | "postgres";
};

const globalDbCache = globalThis as typeof globalThis & DbCache;
const runtimeRoot = path.resolve(
  process.cwd(),
  "src/lib/db/__tests__/runtime",
);
const originalDatabaseDriver = process.env.DATABASE_DRIVER;
const originalDatabaseUrl = process.env.DATABASE_URL;

function resetDbCache() {
  globalDbCache.__dbInstance?.$client?.close?.();
  delete globalDbCache.__dbInstance;
  delete globalDbCache.__dbDriver;
}

describe("getDb", () => {
  beforeEach(() => {
    vi.resetModules();
    resetDbCache();
    fs.rmSync(runtimeRoot, { recursive: true, force: true });
    process.env.DATABASE_DRIVER = "sqlite";
  });

  afterEach(() => {
    resetDbCache();
    fs.rmSync(runtimeRoot, { recursive: true, force: true });

    if (originalDatabaseDriver === undefined) {
      delete process.env.DATABASE_DRIVER;
    } else {
      process.env.DATABASE_DRIVER = originalDatabaseDriver;
    }

    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it("creates a missing parent directory for sqlite file urls", async () => {
    const dbFileRelative = "./src/lib/db/__tests__/runtime/nested/local.db";
    const dbFileAbsolute = path.resolve(process.cwd(), dbFileRelative);
    process.env.DATABASE_URL = `file:${dbFileRelative}`;

    const { getDb } = await import("../client");

    expect(() => getDb()).not.toThrow();
    expect(fs.existsSync(path.dirname(dbFileAbsolute))).toBe(true);
    expect(fs.existsSync(dbFileAbsolute)).toBe(true);
  }, 15_000);

  it("uses a sensible default local sqlite path when DATABASE_URL is unset", async () => {
    delete process.env.DATABASE_URL;
    const dbFileAbsolute = path.resolve(process.cwd(), "local.db");

    const { getDb } = await import("../client");

    expect(() => getDb()).not.toThrow();
    expect(fs.existsSync(dbFileAbsolute)).toBe(true);
  });
});

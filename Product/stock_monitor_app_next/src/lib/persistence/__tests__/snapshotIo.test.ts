import { describe, it, expect } from "vitest";

import {
  exportSnapshot,
  importSnapshot,
  validateSnapshot,
  SNAPSHOT_SCHEMA_VERSION,
} from "@/lib/persistence/snapshotIo";
import { writePersistedString, readPersistedString } from "@/lib/persistenceLayer";

describe("snapshotIo", () => {
  it("round-trips a known persisted key", () => {
    writePersistedString("stock-monitor-saved-screens-v1", '{"hello":"world"}');
    const snap = exportSnapshot();
    expect(snap.schema).toBe(SNAPSHOT_SCHEMA_VERSION);
    expect(snap.entries["stock-monitor-saved-screens-v1"]).toBe('{"hello":"world"}');

    writePersistedString("stock-monitor-saved-screens-v1", "");
    const result = importSnapshot(snap);
    expect(result.imported).toContain("stock-monitor-saved-screens-v1");
    expect(readPersistedString("stock-monitor-saved-screens-v1", "")).toBe('{"hello":"world"}');
  });

  it("rejects non-app payloads", () => {
    expect(validateSnapshot({ hello: "world" })).toBe(false);
    expect(
      validateSnapshot({ app: "investment-navigator-pro", schema: 1, entries: {} }),
    ).toBe(true);
  });

  it("skips unknown keys during import", () => {
    const result = importSnapshot({
      app: "investment-navigator-pro",
      schema: SNAPSHOT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      entries: { "unknown-key": "x" },
    });
    expect(result.imported).not.toContain("unknown-key");
    expect(result.skipped).toContain("unknown-key");
  });
});

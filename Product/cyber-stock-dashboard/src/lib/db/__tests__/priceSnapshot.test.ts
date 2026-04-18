import { describe, it, expect } from "vitest";
import { createTestDb } from "./helper";
import { priceSnapshot } from "../schema";

describe("priceSnapshot UNIQUE constraint", () => {
  it("rejects duplicate (code, market, date)", () => {
    const db = createTestDb();
    db.insert(priceSnapshot)
      .values({
        code: "7203",
        market: "JP",
        date: "2025-01-15",
        close: 2500,
      })
      .run();

    expect(() =>
      db
        .insert(priceSnapshot)
        .values({
          code: "7203",
          market: "JP",
          date: "2025-01-15",
          close: 2510,
        })
        .run()
    ).toThrow();
  });
});

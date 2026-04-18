import { describe, it, expect } from "vitest";
import { createTestDb } from "./helper";
import {
  listWatchlist,
  addWatchlist,
  removeWatchlist,
} from "../repositories/watchlistRepo";

describe("watchlistRepo", () => {
  it("adds (with upsert on conflict), lists and removes", () => {
    const db = createTestDb() as never;
    addWatchlist(db, { code: "AAPL", market: "US", name: "Apple" });
    addWatchlist(db, { code: "AAPL", market: "US", name: "Apple Inc." });
    const items = listWatchlist(db);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Apple Inc.");

    removeWatchlist(db, "AAPL", "US");
    expect(listWatchlist(db)).toHaveLength(0);
  });
});

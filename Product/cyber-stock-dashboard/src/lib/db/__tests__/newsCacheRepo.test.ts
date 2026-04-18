import { describe, it, expect } from "vitest";
import { createTestDb } from "./helper";
import {
  getRecentNews,
  upsertManyNews,
  pruneExpiredNews,
} from "../repositories/newsCacheRepo";

describe("newsCacheRepo", () => {
  it("upserts news idempotently and reads recent first", () => {
    const db = createTestDb() as never;
    const now = Date.now();
    upsertManyNews(db, [
      {
        source: "marketaux",
        externalId: "n1",
        url: "https://x/1",
        title: "older",
        summary: "s1",
        publishedAt: new Date(now - 1000),
      },
      {
        source: "marketaux",
        externalId: "n2",
        url: "https://x/2",
        title: "newer",
        summary: "s2",
        publishedAt: new Date(now),
      },
    ]);
    upsertManyNews(db, [
      {
        source: "marketaux",
        externalId: "n1",
        url: "https://x/1",
        title: "older-updated",
        summary: "s1u",
        publishedAt: new Date(now - 1000),
      },
    ]);
    const recent = getRecentNews(db, 10);
    expect(recent).toHaveLength(2);
    expect(recent[0].title).toBe("newer");
    const old = recent.find((r) => r.externalId === "n1");
    expect(old?.title).toBe("older-updated");
  });

  it("prunes by fetchedAt", () => {
    const db = createTestDb() as never;
    upsertManyNews(db, [
      {
        source: "s",
        externalId: "1",
        url: "u",
        title: "t",
        publishedAt: new Date(),
      },
    ]);
    pruneExpiredNews(db, new Date(Date.now() + 60_000));
    expect(getRecentNews(db)).toHaveLength(0);
  });
});

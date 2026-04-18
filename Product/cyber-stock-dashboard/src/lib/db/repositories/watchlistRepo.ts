import { and, eq } from "drizzle-orm";
import type { Database } from "../client";
import { watchlist, type NewWatchlist, type Watchlist } from "../schema";

export function listWatchlist(db: Database): Watchlist[] {
  return db.select().from(watchlist).all();
}

export function addWatchlist(db: Database, input: NewWatchlist): Watchlist {
  return db
    .insert(watchlist)
    .values(input)
    .onConflictDoUpdate({
      target: [watchlist.code, watchlist.market],
      set: { name: input.name },
    })
    .returning()
    .get();
}

export function removeWatchlist(
  db: Database,
  code: string,
  market: "JP" | "US"
): void {
  db.delete(watchlist)
    .where(and(eq(watchlist.code, code), eq(watchlist.market, market)))
    .run();
}
